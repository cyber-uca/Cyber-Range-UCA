"""
Environments router — VM lifecycle management.
Environments are now linked to a Room (not a Challenge).
"""
import json
import os
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user
from ..gateway.provisioning import get_gateway

router = APIRouter(prefix="/environments", tags=["environments"])


# ── serialiser ─────────────────────────────────────────────────────────────

def _env_out(env: models.Environment) -> dict:
    tl = env.room.estimated_minutes if env.room else 120
    return {
        "id": env.id,
        "room_id": env.room_id,
        "status": env.status,
        "started_at": env.started_at,
        "expires_at": env.expires_at,
        "expires_at_iso": env.expires_at.strftime("%Y-%m-%dT%H:%M:%SZ") if env.expires_at else None,
        "time_limit_minutes": tl,
        "vms": [
            {
                "id": v.id,
                "vm_template": {
                    "id": v.vm_template.id,
                    "name": v.vm_template.name,
                    "zone": v.vm_template.zone,
                    "proxmox_template_id": v.vm_template.proxmox_template_id,
                    "default_tools": v.vm_template.default_tools,
                    "description": v.vm_template.description,
                },
                "ip_address": v.ip_address,
                "proxmox_vmid": v.proxmox_vmid,
                "proxmox_node": v.proxmox_node,
                "status": v.status,
            }
            for v in env.vms
        ],
    }


def _get_or_create_env(user_id: str, room_id: str, db: Session) -> models.Environment:
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    env = db.query(models.Environment).filter(
        models.Environment.user_id == user_id,
        models.Environment.room_id == room_id,
        models.Environment.status.in_([
            models.EnvironmentStatus.RUNNING,
            models.EnvironmentStatus.PROVISIONING,
        ]),
    ).first()

    if env is None:
        env = models.Environment(
            user_id=user_id,
            room_id=room_id,
            status=models.EnvironmentStatus.PROVISIONING,
            topology_json=json.dumps({"nodes": [], "links": []}),
            started_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(minutes=room.estimated_minutes or 120),
        )
        db.add(env)
        db.flush()

    return env


class SingleVMStart(BaseModel):
    vm_template_id: str


class StopVMPayload(BaseModel):
    vm_template_id: str


# ═══════════════════════════════════════════════════════════════════
#  START A SINGLE VM
# ═══════════════════════════════════════════════════════════════════

@router.post("/rooms/{room_id}/start-vm")
def start_single_vm(
    room_id: str,
    payload: SingleVMStart,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    template = db.query(models.VMTemplate).filter(
        models.VMTemplate.id == payload.vm_template_id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="VM template not found")

    env = _get_or_create_env(current_user.id, room_id, db)

    already = db.query(models.EnvironmentVM).filter(
        models.EnvironmentVM.environment_id == env.id,
        models.EnvironmentVM.vm_template_id == template.id,
        models.EnvironmentVM.status == "running",
    ).first()
    if already:
        db.refresh(env)
        return _env_out(env)

    provisioned = get_gateway().clone_vm(
        template_ref=template.proxmox_template_id,
        name_hint=f"{template.name}-{env.id[:8]}",
    )
    get_gateway().start_vm(provisioned.node, provisioned.vmid)

    db.add(models.EnvironmentVM(
        environment_id=env.id,
        vm_template_id=template.id,
        proxmox_vmid=provisioned.vmid,
        proxmox_node=provisioned.node,
        ip_address=provisioned.ip_address,
        status="running",
    ))
    env.status = models.EnvironmentStatus.RUNNING
    db.commit(); db.refresh(env)
    return _env_out(env)


# ═══════════════════════════════════════════════════════════════════
#  STOP A SINGLE VM
# ═══════════════════════════════════════════════════════════════════

@router.post("/rooms/{room_id}/stop-vm")
def stop_single_vm(
    room_id: str,
    payload: StopVMPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    env = db.query(models.Environment).filter(
        models.Environment.user_id == current_user.id,
        models.Environment.room_id == room_id,
        models.Environment.status.in_([
            models.EnvironmentStatus.RUNNING,
            models.EnvironmentStatus.PROVISIONING,
        ]),
    ).first()
    if not env:
        raise HTTPException(status_code=404, detail="No active environment for this room")

    vm = db.query(models.EnvironmentVM).filter(
        models.EnvironmentVM.environment_id == env.id,
        models.EnvironmentVM.vm_template_id == payload.vm_template_id,
        models.EnvironmentVM.status == "running",
    ).first()
    if not vm:
        raise HTTPException(status_code=404, detail="VM not running")

    if vm.proxmox_vmid and vm.proxmox_node:
        try:
            get_gateway().destroy_vm(vm.proxmox_node, vm.proxmox_vmid)
        except Exception as e:
            logger.warning(f"destroy_vm error: {e}")

    vm.status = "stopped"
    if all(v.status != "running" for v in env.vms):
        env.status = models.EnvironmentStatus.DESTROYED
        env.destroyed_at = datetime.utcnow()
    db.commit()
    return {"status": "stopped", "vm_template_id": payload.vm_template_id}


# ═══════════════════════════════════════════════════════════════════
#  GET ENVIRONMENT
# ═══════════════════════════════════════════════════════════════════

@router.get("/{environment_id}", response_model=None)
def get_environment(
    environment_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    env = db.query(models.Environment).filter(models.Environment.id == environment_id).first()
    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")
    if env.user_id != current_user.id and current_user.role == models.Role.LEARNER:
        raise HTTPException(status_code=403, detail="Not your environment")
    return _env_out(env)


# ═══════════════════════════════════════════════════════════════════
#  CONSOLE — returns HTML launcher that sets PVEAuthCookie then redirects
# ═══════════════════════════════════════════════════════════════════

@router.get("/{environment_id}/console/{vm_id}", response_class=HTMLResponse)
def get_console(
    environment_id: str,
    vm_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Returns an HTML page that:
    1. Sets PVEAuthCookie on the Proxmox domain via a hidden iframe ping
    2. Immediately redirects to the noVNC console URL
    This bypasses the 401 caused by Proxmox ignoring the cookie in the URL query string.
    """
    env = db.query(models.Environment).filter(models.Environment.id == environment_id).first()
    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")
    if env.user_id != current_user.id and current_user.role == models.Role.LEARNER:
        raise HTTPException(status_code=403, detail="Not your environment")

    vm = db.query(models.EnvironmentVM).filter(
        models.EnvironmentVM.id == vm_id,
        models.EnvironmentVM.environment_id == environment_id,
    ).first()
    if not vm:
        raise HTTPException(status_code=404, detail="VM not found")
    if not vm.proxmox_vmid or not vm.proxmox_node:
        raise HTTPException(status_code=400, detail="VM not yet provisioned")

    proxmox_host     = os.getenv("PROXMOX_HOST", "192.168.37.20")
    proxmox_user     = os.getenv("PROXMOX_USER", "root@pam")
    proxmox_password = os.getenv("PROXMOX_PASSWORD", "")
    verify_ssl       = os.getenv("PROXMOX_VERIFY_SSL", "false").lower() == "true"

    import urllib.request, urllib.parse, ssl, json as _json

    ticket = csrf = vnc_ticket = None
    vnc_port = 5900

    try:
        ctx = ssl.create_default_context()
        if not verify_ssl:
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE

        # Step 1 — PVE auth ticket
        data = urllib.parse.urlencode({"username": proxmox_user, "password": proxmox_password}).encode()
        req = urllib.request.Request(
            f"https://{proxmox_host}:8006/api2/json/access/ticket",
            data=data, method="POST",
        )
        with urllib.request.urlopen(req, context=ctx, timeout=8) as r:
            body = _json.loads(r.read())
            ticket = body["data"]["ticket"]
            csrf   = body["data"]["CSRFPreventionToken"]

        # Step 2 — one-time VNC ticket via vncproxy
        req2 = urllib.request.Request(
            f"https://{proxmox_host}:8006/api2/json/nodes/{vm.proxmox_node}/qemu/{vm.proxmox_vmid}/vncproxy",
            data=b"websocket=1", method="POST",
            headers={
                "Cookie": f"PVEAuthCookie={ticket}",
                "CSRFPreventionToken": csrf,
                "Content-Type": "application/x-www-form-urlencoded",
            },
        )
        with urllib.request.urlopen(req2, context=ctx, timeout=8) as r2:
            body2 = _json.loads(r2.read())
            vnc_ticket = body2["data"]["ticket"]
            vnc_port   = body2["data"].get("port", 5900)

    except Exception as e:
        logger.warning(f"Console auth error: {e}")

    if not ticket or not vnc_ticket:
        # Fallback — just open Proxmox login
        fallback = f"https://{proxmox_host}:8006/?console=kvm&novnc=1&vmid={vm.proxmox_vmid}&node={vm.proxmox_node}"
        return HTMLResponse(f'<script>window.location="{fallback}";</script>')

    enc_vnc  = urllib.parse.quote(vnc_ticket, safe='')
    vnc_path = f"api2/json/nodes/{vm.proxmox_node}/qemu/{vm.proxmox_vmid}/vncwebsocket/port/{vnc_port}/vncticket/{enc_vnc}"
    console_url = (
        f"https://{proxmox_host}:8006/"
        f"?console=kvm&novnc=1&vmid={vm.proxmox_vmid}&node={vm.proxmox_node}"
        f"&resize=off&lang=en&path={vnc_path}"
    )

    # The HTML page sets the PVEAuthCookie via document.cookie on the Proxmox
    # domain by first navigating a hidden iframe to the Proxmox login endpoint,
    # then redirects to noVNC once the cookie is in place.
    # Because Proxmox is on a different origin (port 8006), we cannot set its
    # cookie directly. Instead we use the ticket=... login redirect that
    # Proxmox itself supports to set the cookie server-side.
    login_redirect = (
        f"https://{proxmox_host}:8006/?login=1"
        f"&username={urllib.parse.quote(proxmox_user)}"
        f"&token={urllib.parse.quote(ticket)}"
    )

    html = f"""<!DOCTYPE html>
<html>
<head><title>Opening VM Console…</title>
<style>body{{background:#0a1220;color:#aaa;font-family:monospace;display:flex;align-items:center;
justify-content:center;height:100vh;margin:0;flex-direction:column;gap:12px}}</style>
</head>
<body>
<div>Opening console for <strong style="color:#00c2e6">{vm.vm_template.name}</strong>…</div>
<div style="font-size:11px;color:#555">If the console does not open, <a href="{console_url}" target="_blank" style="color:#00c2e6">click here</a>.</div>
<script>
(function() {{
  var ticket = {_json.dumps(ticket)};
  var consoleUrl = {_json.dumps(console_url)};
  var proxmoxHost = "https://{proxmox_host}:8006";

  // Open a hidden window to Proxmox to set the PVEAuthCookie in that origin,
  // then immediately redirect it to the noVNC console URL.
  var w = window.open(proxmoxHost + "/?login=1", "_blank",
    "width=1200,height=800,noopener=0");

  // Give Proxmox ~800ms to process the login page request, then navigate to console
  setTimeout(function() {{
    if (w && !w.closed) {{
      w.location.href = consoleUrl;
    }} else {{
      window.open(consoleUrl, "_blank");
    }}
  }}, 800);
}})();
</script>
</body>
</html>"""
    return HTMLResponse(html)


# ── JSON endpoint for frontend that needs the URL ─────────────────────────

@router.get("/{environment_id}/console-url/{vm_id}")
def get_console_url(
    environment_id: str,
    vm_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Returns the console URL as JSON (used by frontend to open in new tab)."""
    env = db.query(models.Environment).filter(models.Environment.id == environment_id).first()
    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")
    if env.user_id != current_user.id and current_user.role == models.Role.LEARNER:
        raise HTTPException(status_code=403, detail="Not your environment")

    vm = db.query(models.EnvironmentVM).filter(
        models.EnvironmentVM.id == vm_id,
        models.EnvironmentVM.environment_id == environment_id,
    ).first()
    if not vm:
        raise HTTPException(status_code=404, detail="VM not found")
    if not vm.proxmox_vmid or not vm.proxmox_node:
        raise HTTPException(status_code=400, detail="VM not yet provisioned")

    proxmox_host     = os.getenv("PROXMOX_HOST", "192.168.37.20")
    proxmox_user     = os.getenv("PROXMOX_USER", "root@pam")
    proxmox_password = os.getenv("PROXMOX_PASSWORD", "")
    verify_ssl       = os.getenv("PROXMOX_VERIFY_SSL", "false").lower() == "true"

    import urllib.request, urllib.parse, ssl, json as _json

    ticket = csrf = vnc_ticket = None
    vnc_port = 5900

    try:
        ctx = ssl.create_default_context()
        if not verify_ssl:
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE

        data = urllib.parse.urlencode({"username": proxmox_user, "password": proxmox_password}).encode()
        req = urllib.request.Request(
            f"https://{proxmox_host}:8006/api2/json/access/ticket",
            data=data, method="POST",
        )
        with urllib.request.urlopen(req, context=ctx, timeout=8) as r:
            body = _json.loads(r.read())
            ticket = body["data"]["ticket"]
            csrf   = body["data"]["CSRFPreventionToken"]

        req2 = urllib.request.Request(
            f"https://{proxmox_host}:8006/api2/json/nodes/{vm.proxmox_node}/qemu/{vm.proxmox_vmid}/vncproxy",
            data=b"websocket=1", method="POST",
            headers={
                "Cookie": f"PVEAuthCookie={ticket}",
                "CSRFPreventionToken": csrf,
                "Content-Type": "application/x-www-form-urlencoded",
            },
        )
        with urllib.request.urlopen(req2, context=ctx, timeout=8) as r2:
            body2 = _json.loads(r2.read())
            vnc_ticket = body2["data"]["ticket"]
            vnc_port   = body2["data"].get("port", 5900)

    except Exception as e:
        logger.warning(f"Console auth error: {e}")

    enc_vnc  = urllib.parse.quote(vnc_ticket or "", safe='')
    vnc_path = f"api2/json/nodes/{vm.proxmox_node}/qemu/{vm.proxmox_vmid}/vncwebsocket/port/{vnc_port}/vncticket/{enc_vnc}"
    console_url = (
        f"https://{proxmox_host}:8006/"
        f"?console=kvm&novnc=1&vmid={vm.proxmox_vmid}&node={vm.proxmox_node}"
        f"&resize=off&lang=en&path={vnc_path}"
    ) if vnc_ticket else f"https://{proxmox_host}:8006/?console=kvm&novnc=1&vmid={vm.proxmox_vmid}&node={vm.proxmox_node}"

    return {
        "console_url": console_url,
        "vmid": vm.proxmox_vmid,
        "node": vm.proxmox_node,
        "vm_name": vm.vm_template.name,
        "ip_address": vm.ip_address,
        "authenticated": bool(vnc_ticket),
    }


# ═══════════════════════════════════════════════════════════════════
#  DESTROY FULL ENVIRONMENT
# ═══════════════════════════════════════════════════════════════════

@router.post("/{environment_id}/destroy")
def destroy_environment(
    environment_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    env = db.query(models.Environment).filter(models.Environment.id == environment_id).first()
    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")
    if env.user_id != current_user.id and current_user.role == models.Role.LEARNER:
        raise HTTPException(status_code=403, detail="Not your environment")

    env.status = models.EnvironmentStatus.DESTROYING
    db.commit()
    for vm in env.vms:
        if vm.proxmox_vmid:
            try:
                get_gateway().destroy_vm(vm.proxmox_node, vm.proxmox_vmid)
            except Exception as e:
                logger.warning(f"destroy_vm {vm.proxmox_vmid}: {e}")
        vm.status = "destroyed"
    env.status = models.EnvironmentStatus.DESTROYED
    env.destroyed_at = datetime.utcnow()
    db.commit()
    return {"status": "destroyed"}
