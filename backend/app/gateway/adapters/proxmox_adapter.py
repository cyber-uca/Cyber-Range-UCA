"""
ProxmoxAdapter — real Proxmox VE cluster integration.

Supports:
  - 3-node cluster (pve1/pve2/pve3)
  - Cloning from regular VMs (not just templates)
  - Task polling — waits for clone/start to actually finish
  - IP retrieval via QEMU guest agent
  - Auto-selects the node that owns the source VM

Required .env variables:
  PROXMOX_HOST         — IP of any cluster node (we use pve1)
  PROXMOX_USER         — e.g. root@pam
  PROXMOX_TOKEN_NAME   — API token ID
  PROXMOX_TOKEN_VALUE  — API token secret
  PROXMOX_NODE         — default target node for new clones
  PROXMOX_VERIFY_SSL   — false for self-signed certs (typical in labs)
"""
import os
import time
import logging

from proxmoxer import ProxmoxAPI

from ..provisioning import ProvisioningGateway, ProvisionedVM

logger = logging.getLogger(__name__)


class ProxmoxAdapter(ProvisioningGateway):

    # How long to wait for a clone/start task to complete (seconds)
    TASK_TIMEOUT = 300
    TASK_POLL_INTERVAL = 3

    def __init__(self):
        self.client = ProxmoxAPI(
            os.environ["PROXMOX_HOST"],
            user=os.environ["PROXMOX_USER"],
            token_name=os.environ["PROXMOX_TOKEN_NAME"],
            token_value=os.environ["PROXMOX_TOKEN_VALUE"],
            verify_ssl=os.getenv("PROXMOX_VERIFY_SSL", "true").lower() == "true",
            timeout=10,
        )
        self.default_node = os.getenv("PROXMOX_NODE", "pve1")

        # Build node list from PROXMOX_NODES env var
        # Format: "pve1:192.168.37.20,pve2:192.168.37.17,pve3:192.168.37.14"
        self._nodes = self._parse_nodes()

    def _parse_nodes(self) -> list[str]:
        """Return list of node names from env, or just the default node."""
        raw = os.getenv("PROXMOX_NODES", "")
        if not raw:
            return [self.default_node]
        return [entry.split(":")[0] for entry in raw.split(",")]

    def _find_node_for_vm(self, vmid: int) -> str:
        """
        Search all cluster nodes to find which one owns a given VMID.
        This is needed because a VM on pve2 can't be cloned from pve1.
        """
        for node in self._nodes:
            try:
                vms = self.client.nodes(node).qemu.get()
                for vm in vms:
                    if int(vm["vmid"]) == int(vmid):
                        logger.info(f"VM {vmid} found on node {node}")
                        return node
            except Exception as e:
                logger.warning(f"Could not query node {node}: {e}")
        # fallback
        logger.warning(f"VM {vmid} not found on any node, using default {self.default_node}")
        return self.default_node

    def _wait_for_task(self, node: str, task_id: str) -> bool:
        """
        Poll a Proxmox task until it finishes.
        Returns True on success, raises on failure/timeout.
        """
        deadline = time.time() + self.TASK_TIMEOUT
        while time.time() < deadline:
            try:
                status = self.client.nodes(node).tasks(task_id).status.get()
                if status.get("status") == "stopped":
                    exit_status = status.get("exitstatus", "")
                    if exit_status == "OK":
                        return True
                    raise RuntimeError(f"Proxmox task {task_id} failed: {exit_status}")
            except RuntimeError:
                raise
            except Exception as e:
                logger.warning(f"Task poll error: {e}")
            time.sleep(self.TASK_POLL_INTERVAL)
        raise TimeoutError(f"Proxmox task {task_id} timed out after {self.TASK_TIMEOUT}s")

    def _get_vm_ip(self, node: str, vmid: int, timeout: int = 60) -> str:
        """
        Try to get the VM's IP via QEMU guest agent.
        Returns empty string if agent is not installed or times out.
        """
        deadline = time.time() + timeout
        while time.time() < deadline:
            try:
                ifaces = self.client.nodes(node).qemu(vmid).agent.get("network-get-interfaces")
                for iface in ifaces.get("result", []):
                    if iface.get("name") in ("eth0", "ens18", "ens3"):
                        for addr in iface.get("ip-addresses", []):
                            if addr.get("ip-address-type") == "ipv4":
                                ip = addr["ip-address"]
                                if not ip.startswith("127."):
                                    return ip
            except Exception:
                pass
            time.sleep(5)
        return ""

    # ── ProvisioningGateway interface ──────────────────────────────────────

    def clone_vm(self, template_ref: int, name_hint: str, target_node=None) -> ProvisionedVM:
        """
        Clone a VM (template or regular stopped/running VM) to a new instance.
        template_ref is the source VMID (e.g. 115 for Kali, 104 for ScadaLTS).
        """
        source_node = self._find_node_for_vm(int(template_ref))
        clone_node  = target_node or source_node  # clone onto the same node by default

        # Get next available VMID from cluster
        new_vmid = int(self.client.cluster.nextid.get())
        vm_name  = f"{name_hint}-{new_vmid}"

        logger.info(f"Cloning VM {template_ref} on {source_node} → new VMID {new_vmid} ({vm_name})")

        task_id = self.client.nodes(source_node).qemu(template_ref).clone.post(
            newid=new_vmid,
            name=vm_name,
            full=1,           # full clone — independent disk, not linked
            target=clone_node,
        )

        self._wait_for_task(source_node, task_id)
        logger.info(f"Clone complete: VMID {new_vmid} on {clone_node}")

        return ProvisionedVM(
            vmid=new_vmid,
            node=clone_node,
            ip_address="",    # filled in after start
            status="stopped",
        )

    def start_vm(self, node: str, vmid: int) -> str:
        logger.info(f"Starting VM {vmid} on {node}")
        task_id = self.client.nodes(node).qemu(vmid).status.start.post()
        self._wait_for_task(node, task_id)
        # Try to get IP after boot (guest agent must be installed in VM)
        ip = self._get_vm_ip(node, vmid, timeout=60)
        if ip:
            logger.info(f"VM {vmid} got IP {ip}")
        return "running"

    def stop_vm(self, node: str, vmid: int) -> str:
        logger.info(f"Stopping VM {vmid} on {node}")
        try:
            task_id = self.client.nodes(node).qemu(vmid).status.stop.post()
            self._wait_for_task(node, task_id)
        except Exception as e:
            logger.warning(f"Stop VM {vmid} error: {e}")
        return "stopped"

    def destroy_vm(self, node: str, vmid: int) -> None:
        """Stop then delete the cloned VM — called when lab session ends."""
        logger.info(f"Destroying VM {vmid} on {node}")
        try:
            self.stop_vm(node, vmid)
        except Exception:
            pass
        try:
            task_id = self.client.nodes(node).qemu(vmid).delete()
            self._wait_for_task(node, task_id)
            logger.info(f"VM {vmid} deleted")
        except Exception as e:
            logger.error(f"Failed to delete VM {vmid}: {e}")

    def get_status(self, node: str, vmid: int) -> str:
        try:
            status = self.client.nodes(node).qemu(vmid).status.current.get()
            return status.get("status", "unknown")
        except Exception:
            return "unknown"

    def create_network_segment(self, name: str) -> str:
        """
        TODO: implement via Proxmox SDN API when your VLAN/VXLAN
        zones are configured for Attack_Net / CAN_Net / SOC_Net etc.
        """
        raise NotImplementedError(
            "SDN network isolation not yet configured. "
            "Set up Proxmox SDN zones then implement this method."
        )
