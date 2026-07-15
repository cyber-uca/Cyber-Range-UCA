"""
Environments router — VM lifecycle management.
Environments are linked to a Room.

Console access uses an nginx reverse proxy at /proxmox/ so that the
PVEAuthCookie is set on the same origin as the app — no cross-origin issues.
"""
import json
import os
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..auth import get_current_user
from ..gateway.provisioning import get_gateway

router = APIRouter(prefix="/environments", tags=["environments"])


# ── helpers ────────────────────────────────────────────────────────────────

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


def _proxmox_auth():
    """Returns (ticket, csrf) from Proxmox password auth, or (None, None)."""
    import urllib.request, urllib.parse, ssl, json as _json

    host     = os.getenv("PROXMOX_HOST", "192.168.37.20")
    user     = os.getenv("PROXMOX_USER", "root@pam")
    password = os.getenv("PROXMOX_PASSWORD", "")
    verify   = os.getenv("PROXMOX_VERIFY_SSL", "false").lower() == "true"

    if not password:
        return None, None

    try:
        ctx = ssl.create_default_context()
        if not verify:
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE

        data = urllib.parse.urlencode({"username": user, "password": password}).encode()
        req = urllib.request.Request(
            f"https://{host}:8006/api2/json/access/ticket",
            data=data, method="POST",
        )
        with urllib.request.urlopen(req, context=ctx, timeout=8) as r:
            body = _json.loads(r.read())
            return body["data"]["ticket"], body["data"]["CSRFPreventionToken"]
    except Exception as e:
        logger.warning(f"Proxmox auth failed: {e}")
        return None, None


def _vnc_ticket(node: str, vmid: int, ticket: str, csrf: str):
    """Returns (vnc_ticket, port) via vncproxy, or (None, 5900)."""
    import urllib.request, urllib.parse, ssl, json as _json

    host   = os.getenv("PROXMOX_HOST", "192.168.37.20")
    verify = os.getenv("PROXMOX_VERIFY_SSL", "false").lower() == "true"

    try:
        ctx = ssl.create_default_context()
        if not verify:
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE

        req = urllib.request.Request(
            f"https://{host}:8006/api2/json/nodes/{node}/qemu/{vmid}/vncproxy",
            data=b"websocket=1", method="POST",
            headers={
                "Cookie": f"PVEAuthCookie={ticket}",
                "CSRFPreventionToken": csrf,
                "Content-Type": "application/x-www-form-urlencoded",
            },
        )
        with urllib.request.urlopen(req, context=ctx, timeout=8) as r:
            body = _json.loads(r.read())
            return body["data"]["ticket"], body["data"].get("port", 5900)
    except Exception as e:
        logger.warning(f"vncproxy failed for vmid {vmid}: {e}")
        return None, 5900


# ── payload models ─────────────────────────────────────────────────────────

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
    db.commit()
    db.refresh(env)
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

@router.get("/{environment_id}")
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
#  CONSOLE URL
#  Returns a JSON payload. The console URL uses /proxmox/ which is
#  reverse-proxied by nginx to https://PROXMOX_HOST:8006/ on the
#  same origin — so the PVEAuthCookie can be set via our own domain.
# ═══════════════════════════════════════════════════════════════════

@router.get("/{environment_id}/console/{vm_id}")
def get_console_url(
    environment_id: str,
    vm_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
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

    import urllib.parse

    proxmox_host = os.getenv("PROXMOX_HOST", "192.168.37.20")

    ticket, csrf = _proxmox_auth()
    vnc_tk, vnc_port = (None, 5900)
    if ticket and csrf:
        vnc_tk, vnc_port = _vnc_ticket(vm.proxmox_node, vm.proxmox_vmid, ticket, csrf)

    if vnc_tk:
        enc_vnc  = urllib.parse.quote(vnc_tk, safe='')
        vnc_path = (
            f"api2/json/nodes/{vm.proxmox_node}/qemu/{vm.proxmox_vmid}"
            f"/vncwebsocket/port/{vnc_port}/vncticket/{enc_vnc}"
        )
        # Use /proxmox/ prefix — nginx proxies this to https://PROXMOX_HOST:8006/
        # This keeps everything on the same origin so cookies work.
        console_url = (
            f"/proxmox/?console=kvm&novnc=1"
            f"&vmid={vm.proxmox_vmid}&node={vm.proxmox_node}"
            f"&resize=off&lang=en&path={vnc_path}"
        )
        authenticated = True
    else:
        # Fallback — direct Proxmox URL, user may need to log in manually
        console_url = (
            f"https://{proxmox_host}:8006/?console=kvm&novnc=1"
            f"&vmid={vm.proxmox_vmid}&node={vm.proxmox_node}&resize=off"
        )
        authenticated = False

    return {
        "console_url": console_url,
        "pve_ticket": ticket,           # frontend sets this as PVEAuthCookie on /proxmox origin
        "vmid": vm.proxmox_vmid,
        "node": vm.proxmox_node,
        "vm_name": vm.vm_template.name,
        "ip_address": vm.ip_address,
        "authenticated": authenticated,
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
