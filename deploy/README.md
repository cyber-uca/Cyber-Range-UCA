# AutoRange Cyber Range — Deployment Guide (Option B)

## Architecture
A dedicated Ubuntu VM runs on Proxmox and hosts the entire platform.
Since it lives on the same network as Proxmox (192.168.37.x), the backend
can reach the Proxmox API directly — no VPN needed.

## VM Requirements (create this in Proxmox)
- OS: Ubuntu 22.04 LTS (server)
- CPU: 2 cores
- RAM: 4 GB
- Disk: 20 GB
- Network: same bridge as your Proxmox nodes (e.g. vmbr0)
- Static IP: e.g. 192.168.37.50 (pick a free IP in your lab subnet)

## What the install script does
1. Installs Python 3.11, Node 20, MySQL, Nginx
2. Clones the repo from GitHub
3. Creates a Python virtualenv and installs backend deps
4. Builds the React frontend
5. Configures Nginx as reverse proxy (port 80 → backend :8000, frontend :5173)
6. Creates systemd services so everything auto-starts on reboot
7. Seeds the database

## Access after deployment
- Platform: http://<VM_IP>  (or your domain if you set one up)
- API docs:  http://<VM_IP>/api/docs

## Making it accessible outside the lab
Option 1 — Campus network: users connect to university WiFi/LAN, access http://192.168.37.50
Option 2 — Port forwarding: forward port 80 on your router to 192.168.37.50
Option 3 — Cloudflare Tunnel: run cloudflared on the VM for a free public HTTPS URL
