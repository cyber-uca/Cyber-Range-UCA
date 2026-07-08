import os

from ..provisioning import ProvisioningGateway, ProvisionedVM

# Raises ImportError if proxmoxer isn't installed - caught by the registry
# loader in provisioning.py, so this adapter simply isn't offered unless
# both the package is installed AND PROVISIONING_BACKEND=proxmox is set.
from proxmoxer import ProxmoxAPI


class ProxmoxAdapter(ProvisioningGateway):
    """
    Talks to a real Proxmox VE cluster. Requires:
      PROXMOX_HOST, PROXMOX_USER, PROXMOX_TOKEN_NAME, PROXMOX_TOKEN_VALUE
      PROXMOX_NODE (default node to clone onto)
    """

    def __init__(self):
        self.client = ProxmoxAPI(
            os.environ["PROXMOX_HOST"],
            user=os.environ["PROXMOX_USER"],
            token_name=os.environ["PROXMOX_TOKEN_NAME"],
            token_value=os.environ["PROXMOX_TOKEN_VALUE"],
            verify_ssl=os.getenv("PROXMOX_VERIFY_SSL", "true").lower() == "true",
        )
        self.default_node = os.environ.get("PROXMOX_NODE", "pve1")

    def clone_vm(self, template_ref, name_hint: str, target_node=None) -> ProvisionedVM:
        node = target_node or self.default_node
        new_vmid = self.client.cluster.nextid.get()
        self.client.nodes(node).qemu(template_ref).clone.post(newid=new_vmid, name=f"{name_hint}-{new_vmid}", full=1)
        # Production code should poll the returned task ID here until the
        # clone finishes before returning - simplified for clarity.
        return ProvisionedVM(vmid=new_vmid, node=node, ip_address="", status="stopped")

    def start_vm(self, node: str, vmid: int) -> str:
        self.client.nodes(node).qemu(vmid).status.start.post()
        return "running"

    def stop_vm(self, node: str, vmid: int) -> str:
        self.client.nodes(node).qemu(vmid).status.stop.post()
        return "stopped"

    def destroy_vm(self, node: str, vmid: int) -> None:
        try:
            self.client.nodes(node).qemu(vmid).status.stop.post()
        except Exception:
            pass
        self.client.nodes(node).qemu(vmid).delete()

    def get_status(self, node: str, vmid: int) -> str:
        status = self.client.nodes(node).qemu(vmid).status.current.get()
        return status.get("status", "unknown")

    def create_network_segment(self, name: str) -> str:
        raise NotImplementedError(
            "Wire this to your Proxmox SDN zone/VNet API once your VLAN/VXLAN "
            "ranges for Attack_Net/CAN_Net/SOC_Net/Backend_Net/Mgmt_Net are defined."
        )
