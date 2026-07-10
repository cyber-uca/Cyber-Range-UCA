#!/bin/bash
# ============================================================
# AutoRange — Update script (run after git pull)
# Usage: sudo ./update.sh
# ============================================================
set -e
APP_DIR="/opt/cyberrange"

GREEN='\033[0;32m'; NC='\033[0m'
log() { echo -e "${GREEN}[+]${NC} $1"; }

log "Pulling latest code..."
cd "$APP_DIR"
git pull origin main

log "Updating Python dependencies..."
cd "$APP_DIR/platform/backend"
source venv/bin/activate
pip install -q -r requirements.txt
deactivate

log "Rebuilding frontend..."
cd "$APP_DIR/platform/frontend"
npm install -q
npm run build

log "Restarting backend service..."
systemctl restart cyberrange-backend

log "Reloading Nginx..."
nginx -t && systemctl reload nginx

echo -e "${GREEN}[✓] Update complete!${NC}"
