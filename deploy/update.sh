#!/bin/bash
# ============================================================
# AutoRange — Update script (run after git pull)
# Usage: sudo GITHUB_TOKEN=ghp_xxx ./update.sh
#        sudo ./update.sh ghp_xxx
# ============================================================
set -e
APP_DIR="/opt/cyberrange"

GITHUB_TOKEN="${GITHUB_TOKEN:-$1}"

GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
log() { echo -e "${GREEN}[+]${NC} $1"; }
err() { echo -e "${RED}[x]${NC} $1"; exit 1; }

[ -z "$GITHUB_TOKEN" ] && err "GitHub token required. Usage: sudo GITHUB_TOKEN=ghp_xxx bash update.sh"

log "Pulling latest code..."
cd "$APP_DIR"
# Temporarily set the authenticated remote, pull, then restore the clean URL
git remote set-url origin "https://${GITHUB_TOKEN}@github.com/arrach-imane/Cyber-Range-UCA.git"
git pull origin main
git remote set-url origin "https://github.com/arrach-imane/Cyber-Range-UCA.git"

log "Updating Python dependencies..."
cd "$APP_DIR/backend"
source venv/bin/activate
pip install -q -r requirements.txt
deactivate

log "Rebuilding frontend..."
cd "$APP_DIR/frontend"
npm ci --legacy-peer-deps
npm run build

log "Restarting backend service..."
systemctl restart cyberrange-backend

log "Reloading Nginx..."
nginx -t && systemctl reload nginx

echo -e "${GREEN}[✓] Update complete!${NC}"
