"""
The provisioning gateway.

This is the ONE stable interface the rest of the platform is allowed to
depend on for turning a VM template into a running (or simulated) machine.
Routers, models, and every other part of the app import `get_gateway()`
from this file and nothing else - never a specific adapter, never
proxmoxer, never docker-py directly.

To add a new infrastructure backend (Docker, a cloud provider, a second
Proxmox cluster with a different API version, ...):
  1. Write a new class in gateway/adapters/ that implements ProvisioningGateway
  2. Add one line to ADAPTER_REGISTRY below
  3. Set PROVISIONING_BACKEND to its key

Nothing else in the codebase changes. That's the whole point of a gateway.
"""
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class ProvisionedVM:
    vmid: int
    node: str
    ip_address: str
    status: str  # "running" | "stopped" | "error"


class ProvisioningGateway(ABC):
    """The contract. Every adapter (simulate, Proxmox, Docker, cloud...) implements this."""

    @abstractmethod
    def clone_vm(self, template_ref, name_hint: str, target_node: Optional[str] = None) -> ProvisionedVM: ...

    @abstractmethod
    def start_vm(self, node: str, vmid: int) -> str: ...

    @abstractmethod
    def stop_vm(self, node: str, vmid: int) -> str: ...

    @abstractmethod
    def destroy_vm(self, node: str, vmid: int) -> None: ...

    @abstractmethod
    def get_status(self, node: str, vmid: int) -> str: ...

    @abstractmethod
    def create_network_segment(self, name: str) -> str: ...


def _load_adapter_registry():
    """
    Imported lazily so that adapters with heavy/optional dependencies
    (proxmoxer, docker-py, boto3...) don't need to be installed unless
    that specific adapter is actually selected.
    """
    from .adapters.simulate_adapter import SimulateAdapter
    registry = {"simulate": SimulateAdapter}

    try:
        from .adapters.proxmox_adapter import ProxmoxAdapter
        registry["proxmox"] = ProxmoxAdapter
    except ImportError:
        pass  # proxmoxer not installed - fine if PROVISIONING_BACKEND isn't "proxmox"

    return registry


ADAPTER_REGISTRY = _load_adapter_registry()

_active_gateway: Optional[ProvisioningGateway] = None


def get_gateway() -> ProvisioningGateway:
    """The single entry point every router uses. Swaps backend via env var only."""
    global _active_gateway
    if _active_gateway is None:
        backend = os.getenv("PROVISIONING_BACKEND", "simulate")
        adapter_cls = ADAPTER_REGISTRY.get(backend)
        if adapter_cls is None:
            raise RuntimeError(
                f"Unknown PROVISIONING_BACKEND '{backend}'. "
                f"Registered adapters: {list(ADAPTER_REGISTRY.keys())}"
            )
        _active_gateway = adapter_cls()
    return _active_gateway
