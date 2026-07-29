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
        "paused_at": env.paused_at.strftime("%Y-%m-%dT%H:%M:%SZ") if env.paused_at else None,
        "time_remaining_seconds": env.time_remaining_seconds,
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
            models.EnvironmentStatus.PAUSED,  # reconnect to a hibernated session instead of cloning a duplicate
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
            last_heartbeat=datetime.utcnow(),
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


# How long the lab page can go without a heartbeat before we treat the user
# as gone and reap their VMs (frees Proxmox resources instead of waiting for
# the full room timer to expire, which could be up to ~2 hours).
HEARTBEAT_TIMEOUT_SECONDS =600 #mettre 10 min


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
        models.EnvironmentVM.status.in_(["running", "paused", "provisioning"]),
    ).first()
    if already:
        if already.status == "provisioning":
            # A clone is already in flight for this template — e.g. the user
            # double-clicked Start, or refreshed the page while the first
            # clone+start (which can take minutes on real Proxmox) was still
            # running. Don't clone a second VM on top of it; the original
            # request will flip this row to "running" when it finishes.
            env.last_heartbeat = datetime.utcnow()
            db.commit()
            db.refresh(env)
            return _env_out(env)
        if already.status == "paused":
            # Hibernated (e.g. auto-paused after the lab page went quiet) —
            # resume it instead of cloning a brand new VM.
            get_gateway().resume_vm(already.proxmox_node, already.proxmox_vmid)
            already.status = "running"
            remaining = env.time_remaining_seconds or (env.room.estimated_minutes or 120) * 60
            env.expires_at = datetime.utcnow() + timedelta(seconds=remaining)
            env.paused_at = None
            env.time_remaining_seconds = None
        env.status = models.EnvironmentStatus.RUNNING
        env.last_heartbeat = datetime.utcnow()
        db.commit()
        db.refresh(env)
        return _env_out(env)

    # Claim a "provisioning" slot for this template *before* the slow
    # clone+start calls, in the same transaction. This is what actually
    # closes the duplicate-clone race: any request that lands while the
    # clone is still running (a second click, or a page refresh calling
    # start-vm again) will hit the `already.status == "provisioning"`
    # branch above instead of cloning a second VM.
    vm_row = models.EnvironmentVM(
        environment_id=env.id,
        vm_template_id=template.id,
        status="provisioning",
    )
    db.add(vm_row)
    env.status = models.EnvironmentStatus.PROVISIONING
    db.commit()
    db.refresh(vm_row)

    try:
        provisioned = get_gateway().clone_vm(
            template_ref=template.proxmox_template_id,
            name_hint=f"{template.name}-{env.id[:8]}",
        )
        get_gateway().start_vm(provisioned.node, provisioned.vmid)
    except Exception as e:
        db.delete(vm_row)
        remaining = [v for v in env.vms if v.id != vm_row.id]
        if any(v.status == "running" for v in remaining):
            env.status = models.EnvironmentStatus.RUNNING
        elif any(v.status == "paused" for v in remaining):
            env.status = models.EnvironmentStatus.PAUSED
        else:
            # Nothing else running in this environment — leave no dangling
            # PROVISIONING row behind (it would never get cleaned up and
            # would block re-provisioning on retry).
            env.status = models.EnvironmentStatus.DESTROYED
            env.destroyed_at = datetime.utcnow()
        db.commit()
        raise HTTPException(status_code=502, detail=f"Failed to provision VM: {e}")

    vm_row.proxmox_vmid = provisioned.vmid
    vm_row.proxmox_node = provisioned.node
    vm_row.ip_address = provisioned.ip_address
    vm_row.status = "running"
    env.status = models.EnvironmentStatus.RUNNING
    db.commit()
    db.refresh(env)
    return _env_out(env)


# ═══════════════════════════════════════════════════════════════════
#  PAUSE A SINGLE VM
# ═══════════════════════════════════════════════════════════════════

@router.post("/rooms/{room_id}/pause-vm")
def pause_single_vm(
    room_id: str,
    payload: StopVMPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Suspend the VM on Proxmox and freeze the countdown timer."""
    env = db.query(models.Environment).filter(
        models.Environment.user_id == current_user.id,
        models.Environment.room_id == room_id,
        models.Environment.status == models.EnvironmentStatus.RUNNING,
    ).first()
    if not env:
        raise HTTPException(status_code=404, detail="No running environment for this room")

    vm = db.query(models.EnvironmentVM).filter(
        models.EnvironmentVM.environment_id == env.id,
        models.EnvironmentVM.vm_template_id == payload.vm_template_id,
        models.EnvironmentVM.status == "running",
    ).first()
    if not vm:
        raise HTTPException(status_code=404, detail="VM not running")

    # Suspend the VM on Proxmox
    if vm.proxmox_vmid and vm.proxmox_node:
        try:
            get_gateway().suspend_vm(vm.proxmox_node, vm.proxmox_vmid)
        except Exception as e:
            logger.warning(f"suspend_vm error (continuing anyway): {e}")

    # Save remaining time and mark as paused
    now = datetime.utcnow()
    if env.expires_at and env.expires_at > now:
        env.time_remaining_seconds = int((env.expires_at - now).total_seconds())
    else:
        env.time_remaining_seconds = 0
    env.paused_at = now
    env.status = models.EnvironmentStatus.PAUSED
    vm.status = "paused"
    db.commit()
    db.refresh(env)
    return {**_env_out(env), "time_remaining_seconds": env.time_remaining_seconds}


# ═══════════════════════════════════════════════════════════════════
#  RESUME A SINGLE VM
# ═══════════════════════════════════════════════════════════════════

@router.post("/rooms/{room_id}/resume-vm")
def resume_single_vm(
    room_id: str,
    payload: StopVMPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Resume a suspended VM and restart the countdown from remaining time."""
    env = db.query(models.Environment).filter(
        models.Environment.user_id == current_user.id,
        models.Environment.room_id == room_id,
        models.Environment.status == models.EnvironmentStatus.PAUSED,
    ).first()
    if not env:
        raise HTTPException(status_code=404, detail="No paused environment for this room")

    vm = db.query(models.EnvironmentVM).filter(
        models.EnvironmentVM.environment_id == env.id,
        models.EnvironmentVM.vm_template_id == payload.vm_template_id,
        models.EnvironmentVM.status == "paused",
    ).first()
    if not vm:
        raise HTTPException(status_code=404, detail="VM not paused")

    # Resume the VM on Proxmox
    if vm.proxmox_vmid and vm.proxmox_node:
        try:
            get_gateway().resume_vm(vm.proxmox_node, vm.proxmox_vmid)
        except Exception as e:
            logger.warning(f"resume_vm error (continuing anyway): {e}")

    # Restart timer from remaining time
    remaining = env.time_remaining_seconds or 3600
    env.expires_at = datetime.utcnow() + timedelta(seconds=remaining)
    env.paused_at = None
    env.time_remaining_seconds = None
    env.status = models.EnvironmentStatus.RUNNING
    vm.status = "running"
    db.commit()
    db.refresh(env)
    return _env_out(env)




@router.post("/rooms/{room_id}/stop-vm")
def stop_single_vm(
    room_id: str,
    payload: StopVMPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # A hibernated (paused) VM must also be stoppable — it wasn't running,
    # but it still holds Proxmox disk/vmid resources that Stop should free.
    env = db.query(models.Environment).filter(
        models.Environment.user_id == current_user.id,
        models.Environment.room_id == room_id,
        models.Environment.status.in_([
            models.EnvironmentStatus.RUNNING,
            models.EnvironmentStatus.PROVISIONING,
            models.EnvironmentStatus.PAUSED,
        ]),
    ).first()
    if not env:
        raise HTTPException(status_code=404, detail="No active environment for this room")

    vm = db.query(models.EnvironmentVM).filter(
        models.EnvironmentVM.environment_id == env.id,
        models.EnvironmentVM.vm_template_id == payload.vm_template_id,
        models.EnvironmentVM.status.in_(["running", "paused"]),
    ).first()
    if not vm:
        raise HTTPException(status_code=404, detail="VM not running")

    if vm.proxmox_vmid and vm.proxmox_node:
        try:
            get_gateway().destroy_vm(vm.proxmox_node, vm.proxmox_vmid)
        except Exception as e:
            logger.warning(f"destroy_vm error: {e}")

    vm.status = "stopped"
    if all(v.status not in ("running", "paused") for v in env.vms):
        env.status = models.EnvironmentStatus.DESTROYED
        env.destroyed_at = datetime.utcnow()
    db.commit()
    return {"status": "stopped", "vm_template_id": payload.vm_template_id}


# ═══════════════════════════════════════════════════════════════════
#  HEARTBEAT — the lab page pings this while it's open so the cleanup
#  scheduler can tell a live session apart from an abandoned one.
# ═══════════════════════════════════════════════════════════════════

@router.post("/rooms/{room_id}/heartbeat")
def heartbeat(
    room_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    The heartbeat used to be a one-way ping (front → back) and never told the
    front what actually happened server-side (e.g. an auto-pause). Now it
    round-trips the current environment state so the front can reconcile its
    local status (running/paused/provisioning) on every ping instead of only
    on a manual page reload.
    """
    env = db.query(models.Environment).filter(
        models.Environment.user_id == current_user.id,
        models.Environment.room_id == room_id,
        models.Environment.status.in_([
            models.EnvironmentStatus.RUNNING,
            models.EnvironmentStatus.PROVISIONING,
            models.EnvironmentStatus.PAUSED,
        ]),
    ).first()
    if not env:
        return {"ok": True, "env": None}
    if env.status in (models.EnvironmentStatus.RUNNING, models.EnvironmentStatus.PROVISIONING):
        env.last_heartbeat = datetime.utcnow()
        db.commit()
        db.refresh(env)
    return {"ok": True, "env": _env_out(env)}


# ═══════════════════════════════════════════════════════════════════
#  MY ENVIRONMENT FOR THIS ROOM
#  Lets the lab page recover VM state on load/refresh instead of always
#  starting from a blank slate (which used to risk cloning a duplicate VM
#  on top of one that's still running or hibernated).
# ═══════════════════════════════════════════════════════════════════

@router.get("/rooms/{room_id}/mine")
def get_my_environment(
    room_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    env = db.query(models.Environment).filter(
        models.Environment.user_id == current_user.id,
        models.Environment.room_id == room_id,
        models.Environment.status.in_([
            models.EnvironmentStatus.RUNNING,
            models.EnvironmentStatus.PROVISIONING,
            models.EnvironmentStatus.PAUSED,
        ]),
    ).first()
    if not env:
        return None
    return _env_out(env)


# ═══════════════════════════════════════════════════════════════════
#  LEAVE ALL — called on logout. A deliberate "Sign out" click is a much
#  stronger signal than a tab just going quiet: instead of hibernating (which
#  keeps the environment/VM rows around, resumable), fully destroy every
#  running or paused environment the user has across all rooms so nothing
#  of the old session lingers in the DB for the next login to collide with.
#  In-flight PROVISIONING clones are left alone — destroying mid-clone would
#  race the still-running start-vm request.
# ═══════════════════════════════════════════════════════════════════

@router.post("/leave-all")
def leave_all(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    now = datetime.utcnow()
    envs = db.query(models.Environment).filter(
        models.Environment.user_id == current_user.id,
        models.Environment.status.in_([
            models.EnvironmentStatus.RUNNING,
            models.EnvironmentStatus.PAUSED,
        ]),
    ).all()
    for env in envs:
        _destroy_env_vms(env, db, now)
    if envs:
        db.commit()
    return {"destroyed": len(envs)}


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

    # Verify the VM still exists on Proxmox before trying to get a VNC ticket
    import urllib.request, urllib.parse, ssl, json as _json
    proxmox_host = os.getenv("PROXMOX_HOST", "192.168.37.20")
    verify_ssl   = os.getenv("PROXMOX_VERIFY_SSL", "false").lower() == "true"
    proxmox_user = os.getenv("PROXMOX_USER", "root@pam")
    proxmox_pass = os.getenv("PROXMOX_PASSWORD", "")

    ctx = ssl.create_default_context()
    if not verify_ssl:
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

    vm_exists = False
    if proxmox_pass:
        try:
            data = urllib.parse.urlencode({"username": proxmox_user, "password": proxmox_pass}).encode()
            r = urllib.request.urlopen(
                urllib.request.Request(f"https://{proxmox_host}:8006/api2/json/access/ticket", data=data, method="POST"),
                context=ctx, timeout=5
            )
            chk_ticket = _json.loads(r.read())["data"]["ticket"]
            chk_req = urllib.request.Request(
                f"https://{proxmox_host}:8006/api2/json/nodes/{vm.proxmox_node}/qemu/{vm.proxmox_vmid}/status/current",
                headers={"Cookie": f"PVEAuthCookie={chk_ticket}"}
            )
            urllib.request.urlopen(chk_req, context=ctx, timeout=5)
            vm_exists = True
        except Exception:
            vm_exists = False

    if not vm_exists and proxmox_pass:
        # VM was deleted on Proxmox directly — clean up DB record
        vm.status = "stopped"
        if all(v.status != "running" for v in env.vms):
            env.status = models.EnvironmentStatus.DESTROYED
        db.commit()
        raise HTTPException(
            status_code=410,
            detail="VM no longer exists on Proxmox — it was likely deleted externally. Click Stop then Start to provision a fresh one."
        )

    import urllib.parse

    proxmox_host = os.getenv("PROXMOX_HOST", "192.168.37.20")

    ticket, csrf = _proxmox_auth()
    vnc_tk, vnc_port = (None, 5900)
    if ticket and csrf:
        vnc_tk, vnc_port = _vnc_ticket(vm.proxmox_node, vm.proxmox_vmid, ticket, csrf)

    if vnc_tk:
        enc_vnc    = urllib.parse.quote(vnc_tk, safe='')
        enc_cookie = urllib.parse.quote(ticket, safe='')
        vnc_path   = (
            f"api2/json/nodes/{vm.proxmox_node}/qemu/{vm.proxmox_vmid}"
            f"/vncwebsocket/port/{vnc_port}/vncticket/{enc_vnc}"
        )
        # Always use the cluster entry node (pve1) — Proxmox routes internally.
        # PVEAuthCookie in query string authenticates the initial page load.
        console_url = (
            f"https://{proxmox_host}:8006/"
            f"?console=kvm&novnc=1"
            f"&vmid={vm.proxmox_vmid}&node={vm.proxmox_node}"
            f"&resize=off&lang=en"
            f"&path={vnc_path}"
            f"&PVEAuthCookie={enc_cookie}"
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
#  BACKGROUND CLEANUP — destroy expired environments
# ═══════════════════════════════════════════════════════════════════

@router.post("/cleanup-expired")
def cleanup_expired(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Destroy all environments where expires_at < now. Admin only."""
    if current_user.role not in (models.Role.ADMIN, models.Role.TUTOR):
        raise HTTPException(status_code=403, detail="Admin only")
    return _do_cleanup(db)


# How long an environment can sit PAUSED (hibernated, resumable) before we
# treat it as genuinely abandoned rather than "stepped away, coming back"
# and actually destroy it.
PAUSED_ABANDON_HOURS = 24#0.02#24


def _destroy_env_vms(env: models.Environment, db: Session, now: datetime):
    for vm in env.vms:
        if vm.proxmox_vmid and vm.status in ("running", "paused"):
            try:
                get_gateway().destroy_vm(vm.proxmox_node, vm.proxmox_vmid)
            except Exception as e:
                logger.warning(f"auto-cleanup destroy_vm {vm.proxmox_vmid}: {e}")
        vm.status = "stopped"
    env.status = models.EnvironmentStatus.DESTROYED
    env.destroyed_at = now


def _auto_pause_env(env: models.Environment, db: Session, now: datetime):
    """
    Hibernate every running VM in the environment and freeze the timer.
    Used when the lab page's heartbeat goes stale — the user may just have
    closed the tab to go do something else, so we don't want to nuke their
    progress. Hibernating actually frees the Proxmox host's RAM/CPU (see
    ProxmoxAdapter.suspend_vm), and the session resumes right where it left
    off via the normal Resume action.
    """
    for vm in env.vms:
        if vm.status == "running" and vm.proxmox_vmid and vm.proxmox_node:
            try:
                get_gateway().suspend_vm(vm.proxmox_node, vm.proxmox_vmid)
            except Exception as e:
                logger.warning(f"auto-pause suspend_vm {vm.proxmox_vmid}: {e}")
                continue
            vm.status = "paused"
    if env.expires_at and env.expires_at > now:
        env.time_remaining_seconds = int((env.expires_at - now).total_seconds())
    else:
        env.time_remaining_seconds = 0
    env.paused_at = now
    env.status = models.EnvironmentStatus.PAUSED


def _do_cleanup(db):
    """Internal cleanup — can be called from scheduler or endpoint."""
    now = datetime.utcnow()
    heartbeat_cutoff = now - timedelta(seconds=HEARTBEAT_TIMEOUT_SECONDS)
    paused_abandon_cutoff = now - timedelta(hours=PAUSED_ABANDON_HOURS)

    expired = db.query(models.Environment).filter(
        models.Environment.status == models.EnvironmentStatus.RUNNING,
        models.Environment.expires_at < now,
    ).all()

    # A RUNNING environment whose lab page stopped sending heartbeats (tab
    # closed, browser crashed, user navigated away). We don't know *why*
    # they left, so assume the best case — auto-pause (hibernate) instead
    # of destroying, freeing resources now while letting them Resume later.
    abandoned = db.query(models.Environment).filter(
        models.Environment.status == models.EnvironmentStatus.RUNNING,
        models.Environment.last_heartbeat.isnot(None),
        models.Environment.last_heartbeat < heartbeat_cutoff,
    ).all()

    # Paused (by hand or auto) and never resumed for a long time — that's
    # a genuine abandonment, not a quick errand. Fully destroy it.
    stale_paused = db.query(models.Environment).filter(
        models.Environment.status == models.EnvironmentStatus.PAUSED,
        models.Environment.paused_at.isnot(None),
        models.Environment.paused_at < paused_abandon_cutoff,
    ).all()

    destroyed = 0
    auto_paused = 0

    for env in expired:
        _destroy_env_vms(env, db, now)
        destroyed += 1

    for env in abandoned:
        _auto_pause_env(env, db, now)
        auto_paused += 1

    for env in stale_paused:
        _destroy_env_vms(env, db, now)
        destroyed += 1

    if destroyed or auto_paused:
        db.commit()
        logger.info(
            f"Auto-cleanup: destroyed {destroyed} environment(s) "
            f"({len(expired)} expired, {len(stale_paused)} abandoned-while-paused), "
            f"auto-paused {auto_paused} abandoned-while-running session(s)"
        )
    return {"destroyed": destroyed, "auto_paused": auto_paused}


# Register periodic cleanup on startup
def start_cleanup_scheduler(app):
    import threading
    def _run():
        import time
        while True:
            time.sleep(30)  # heartbeats go stale after HEARTBEAT_TIMEOUT_SECONDS — poll often enough to catch that
            try:
                from ..database import SessionLocal
                db = SessionLocal()
                result = _do_cleanup(db)
                db.close()
                if result["destroyed"] or result["auto_paused"]:
                    logger.info(f"Scheduled cleanup: {result}")
            except Exception as e:
                logger.warning(f"Cleanup scheduler error: {e}")
    t = threading.Thread(target=_run, daemon=True)
    t.start()
    logger.info("Environment cleanup scheduler started (30s interval)")


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
