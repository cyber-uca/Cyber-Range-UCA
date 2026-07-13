import json
import os
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
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
    Returns the Proxmox noVNC console URL for a specific VM in an environment.
    The learner's browser opens this URL in a new tab or iframe.
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

    proxmox_host = os.getenv("PROXMOX_HOST", "192.168.37.20")

    # Proxmox noVNC console URL — opens directly in browser, no auth token needed
    # when accessed from within the same network
    console_url = (
        f"https://{proxmox_host}:8006/"
        f"?console=kvm&novnc=1"
        f"&vmid={vm.proxmox_vmid}"
        f"&node={vm.proxmox_node}"
        f"&resize=off&lang=en"
    )

    return {
        "console_url": console_url,
        "vmid": vm.proxmox_vmid,
        "node": vm.proxmox_node,
        "vm_name": vm.vm_template.name,
        "ip_address": vm.ip_address,
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
