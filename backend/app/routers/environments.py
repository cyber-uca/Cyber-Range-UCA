import json
import os
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user
from ..gateway.provisioning import get_gateway

router = APIRouter(prefix="/environments", tags=["environments"])


@router.post("/{challenge_id}/start", response_model=schemas.EnvironmentOut)
def start_environment(
    challenge_id: str,
    topology: schemas.TopologySave,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    if not topology.nodes:
        raise HTTPException(status_code=400, detail="Drag at least one VM onto the canvas before starting")

    env = models.Environment(
        user_id=current_user.id,
        challenge_id=challenge_id,
        status=models.EnvironmentStatus.PROVISIONING,
        topology_json=json.dumps(topology.model_dump()),
        started_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(minutes=challenge.time_limit_minutes),
    )
    db.add(env)
    db.flush()

    # Provision one cloned VM per node the learner placed on the canvas.
    for node in topology.nodes:
        template = db.query(models.VMTemplate).filter(models.VMTemplate.id == node.vm_template_id).first()
        if not template:
            continue
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

    # NOTE: network segment creation (isolated VNet per session) and wiring
    # the drawn `topology.links` into actual Proxmox bridges/VLANs happens
    # here too - see ProxmoxService.create_network_segment for the extension
    # point once your SDN zones are defined.

    env.status = models.EnvironmentStatus.RUNNING
    db.commit()
    db.refresh(env)
    return env


class SingleVMStart(BaseModel):
    vm_template_id: str


@router.post("/{challenge_id}/start-vm", response_model=schemas.EnvironmentOut)
def start_single_vm(
    challenge_id: str,
    payload: SingleVMStart,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Start a single VM for a challenge.
    - If no environment exists yet for this user+challenge, creates one.
    - If an environment already exists (from a previous VM start), adds the
      new VM to it.
    - If this VM template is already running in the environment, returns the
      existing environment unchanged.
    This is what powers the per-VM Start buttons in the Room Lab page.
    """
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    template = db.query(models.VMTemplate).filter(models.VMTemplate.id == payload.vm_template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="VM template not found")

    # Find or create the environment for this user+challenge
    env = db.query(models.Environment).filter(
        models.Environment.user_id == current_user.id,
        models.Environment.challenge_id == challenge_id,
        models.Environment.status.in_([
            models.EnvironmentStatus.RUNNING,
            models.EnvironmentStatus.PROVISIONING,
        ]),
    ).first()

    if env is None:
        env = models.Environment(
            user_id=current_user.id,
            challenge_id=challenge_id,
            status=models.EnvironmentStatus.PROVISIONING,
            topology_json=json.dumps({"nodes": [], "links": []}),
            started_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(minutes=challenge.time_limit_minutes),
        )
        db.add(env)
        db.flush()

    # Check if this template is already running in this environment
    already = db.query(models.EnvironmentVM).filter(
        models.EnvironmentVM.environment_id == env.id,
        models.EnvironmentVM.vm_template_id == template.id,
        models.EnvironmentVM.status == "running",
    ).first()
    if already:
        db.refresh(env)
        return env

    # Provision and start the VM
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
    return env


class StopVMPayload(BaseModel):
    vm_template_id: str


@router.post("/{challenge_id}/stop-vm")
def stop_single_vm(
    challenge_id: str,
    payload: StopVMPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Stop and destroy a single VM within the challenge's environment."""
    env = db.query(models.Environment).filter(
        models.Environment.user_id == current_user.id,
        models.Environment.challenge_id == challenge_id,
        models.Environment.status.in_([
            models.EnvironmentStatus.RUNNING,
            models.EnvironmentStatus.PROVISIONING,
        ]),
    ).first()
    if not env:
        raise HTTPException(status_code=404, detail="No active environment for this challenge")

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
    # if all VMs are stopped, mark env as destroyed
    all_stopped = all(v.status != "running" for v in env.vms)
    if all_stopped:
        env.status = models.EnvironmentStatus.DESTROYED
        env.destroyed_at = datetime.utcnow()
    db.commit()
    db.refresh(env)
    return {"status": "stopped", "vm_template_id": payload.vm_template_id}


@router.get("/{environment_id}", response_model=schemas.EnvironmentOut)
def get_environment(environment_id: str, db: Session = Depends(get_db),
                     current_user: models.User = Depends(get_current_user)):
    env = db.query(models.Environment).filter(models.Environment.id == environment_id).first()
    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")
    if env.user_id != current_user.id and current_user.role == models.Role.LEARNER:
        raise HTTPException(status_code=403, detail="Not your environment")
    return env


@router.post("/{environment_id}/reset", response_model=schemas.EnvironmentOut)
def reset_environment(environment_id: str, db: Session = Depends(get_db),
                       current_user: models.User = Depends(get_current_user)):
    """Destroys and re-clones every VM in the environment from its template."""
    env = db.query(models.Environment).filter(models.Environment.id == environment_id).first()
    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")

    for vm in env.vms:
        if vm.proxmox_vmid:
            get_gateway().destroy_vm(vm.proxmox_node, vm.proxmox_vmid)
        template = vm.vm_template
        provisioned = get_gateway().clone_vm(template.proxmox_template_id, f"{template.name}-reset")
        get_gateway().start_vm(provisioned.node, provisioned.vmid)
        vm.proxmox_vmid = provisioned.vmid
        vm.proxmox_node = provisioned.node
        vm.ip_address = provisioned.ip_address
        vm.status = "running"

    env.status = models.EnvironmentStatus.RUNNING
    db.commit()
    db.refresh(env)
    return env


@router.get("/{environment_id}/console/{vm_id}")
def get_console_url(
    environment_id: str,
    vm_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Returns a fully authenticated Proxmox noVNC console URL.
    Generates a short-lived Proxmox ticket + CSRF token server-side
    so the learner's browser opens the VM console directly without
    ever seeing the Proxmox login screen.
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
        raise HTTPException(status_code=404, detail="VM not found in this environment")
    if not vm.proxmox_vmid or not vm.proxmox_node:
        raise HTTPException(status_code=400, detail="VM not yet provisioned")

    proxmox_host  = os.getenv("PROXMOX_HOST", "192.168.37.20")
    proxmox_user  = os.getenv("PROXMOX_USER", "root@pam")
    token_name    = os.getenv("PROXMOX_TOKEN_NAME", "cyberrange")
    token_value   = os.getenv("PROXMOX_TOKEN_VALUE", "")
    verify_ssl    = os.getenv("PROXMOX_VERIFY_SSL", "false").lower() == "true"

    # ── Request a Proxmox session ticket using the API token ────────────────
    # Proxmox supports two auth paths:
    #   1. username/password  → returns ticket + CSRFPreventionToken
    #   2. API token          → does NOT return a ticket (tokens can't generate tickets)
    # noVNC requires a ticket, so we must use password auth here.
    # We fall back to the API token auth URL format if no password is available.

    proxmox_password = os.getenv("PROXMOX_PASSWORD", "")

    ticket = None
    csrf   = None

    if proxmox_password:
        try:
            import urllib.request, urllib.parse, ssl, json as _json
            ctx = ssl.create_default_context()
            if not verify_ssl:
                ctx.check_hostname = False
                ctx.verify_mode    = ssl.CERT_NONE

            payload = urllib.parse.urlencode({
                "username": proxmox_user,
                "password": proxmox_password,
            }).encode()

            req = urllib.request.Request(
                f"https://{proxmox_host}:8006/api2/json/access/ticket",
                data=payload, method="POST",
            )
            with urllib.request.urlopen(req, context=ctx, timeout=8) as resp:
                data   = _json.loads(resp.read())
                ticket = data["data"]["ticket"]
                csrf   = data["data"]["CSRFPreventionToken"]
        except Exception as e:
            logger.warning(f"Could not obtain Proxmox ticket: {e}")

    if ticket and csrf:
        # Fully authenticated URL — no login screen
        console_url = (
            f"https://{proxmox_host}:8006/?"
            f"console=kvm&novnc=1"
            f"&vmid={vm.proxmox_vmid}"
            f"&node={vm.proxmox_node}"
            f"&resize=off&lang=en"
            f"&ticket={urllib.parse.quote(ticket)}"
            f"&csrf={urllib.parse.quote(csrf)}"
        )
    else:
        # Fallback — learner may need to log in once manually
        logger.warning("Falling back to unauthenticated noVNC URL (add PROXMOX_PASSWORD to .env for auto-auth)")
        console_url = (
            f"https://{proxmox_host}:8006/?"
            f"console=kvm&novnc=1"
            f"&vmid={vm.proxmox_vmid}"
            f"&node={vm.proxmox_node}"
            f"&resize=off&lang=en"
        )

    return {
        "console_url": console_url,
        "vmid":        vm.proxmox_vmid,
        "node":        vm.proxmox_node,
        "vm_name":     vm.vm_template.name,
        "ip_address":  vm.ip_address,
        "authenticated": bool(ticket),
    }


@router.post("/{environment_id}/destroy")
def destroy_environment(environment_id: str, db: Session = Depends(get_db),
                         current_user: models.User = Depends(get_current_user)):
    env = db.query(models.Environment).filter(models.Environment.id == environment_id).first()
    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")

    env.status = models.EnvironmentStatus.DESTROYING
    db.commit()

    for vm in env.vms:
        if vm.proxmox_vmid:
            get_gateway().destroy_vm(vm.proxmox_node, vm.proxmox_vmid)
        vm.status = "destroyed"

    env.status = models.EnvironmentStatus.DESTROYED
    env.destroyed_at = datetime.utcnow()
    db.commit()
    return {"status": "destroyed"}
