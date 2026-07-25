import random
import time
import ipaddress

from ..provisioning import ProvisioningGateway, ProvisionedVM


class SimulateAdapter(ProvisioningGateway):
    """
    Fakes VM cloning/start/stop/destroy entirely in memory, so the whole
    platform can be built, tested, and demoed without any real
    infrastructure. This is the default (PROVISIONING_BACKEND=simulate).
    """

    def __init__(self):
        self._fake_ip_pool = ipaddress.ip_network("10.66.0.0/16")
        self._used_vmids = set(range(9000, 9010))
        self.default_node = "sim-node-1"

    def clone_vm(self, template_ref, name_hint: str, target_node=None) -> ProvisionedVM:
        node = target_node or self.default_node
        new_vmid = max(self._used_vmids) + 1 if self._used_vmids else 9100
        self._used_vmids.add(new_vmid)
        fake_ip = str(list(self._fake_ip_pool.hosts())[new_vmid % 60000])
        time.sleep(0.1)
        return ProvisionedVM(vmid=new_vmid, node=node, ip_address=fake_ip, status="stopped")

    def start_vm(self, node: str, vmid: int) -> str:
        time.sleep(0.05)
        return "running"

    def stop_vm(self, node: str, vmid: int) -> str:
        time.sleep(0.05)
        return "stopped"

    def destroy_vm(self, node: str, vmid: int) -> None:
        self._used_vmids.discard(vmid)

    def get_status(self, node: str, vmid: int) -> str:
        return "running"

    def suspend_vm(self, node: str, vmid: int) -> None:
        time.sleep(0.05)

    def resume_vm(self, node: str, vmid: int) -> None:
        time.sleep(0.05)

    def create_network_segment(self, name: str) -> str:
        return f"sim-vnet-{name}-{random.randint(1000, 9999)}"
