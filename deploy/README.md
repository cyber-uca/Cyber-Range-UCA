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
2. Clones the repo from GitHub (requires a token — see below)
3. Creates a Python virtualenv and installs backend deps
4. Builds the React frontend
5. Configures Nginx as reverse proxy (port 80 → backend :8000, frontend static)
6. Creates systemd services so everything auto-starts on reboot
7. Seeds the database

## Private repo — GitHub token setup

The repo is private so the install script needs a GitHub Personal Access Token (PAT).

1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens**
2. Click **Generate new token**
3. Set expiration (90 days is fine for a lab)
4. Under **Repository access** select only `Cyber-Range-UCA`
5. Under **Permissions → Repository permissions** set **Contents** to `Read-only`
6. Generate and copy the token (starts with `ghp_`)

Pass the token when running the script — it is never written to disk:
```bash
sudo GITHUB_TOKEN=ghp_xxxxxxxxxxxx bash deploy/install.sh
```

Or as a positional argument:
```bash
sudo bash deploy/install.sh ghp_xxxxxxxxxxxx
```

## Access after deployment
- Platform: http://<VM_IP>  (or your domain if you set one up)
- API docs:  http://<VM_IP>/api/docs

## Making it accessible outside the lab
Option 1 — Campus network: users connect to university WiFi/LAN, access http://192.168.37.50
Option 2 — Port forwarding: forward port 80 on your router to 192.168.37.50
Option 3 — Cloudflare Tunnel: run cloudflared on the VM for a free public HTTPS URL
