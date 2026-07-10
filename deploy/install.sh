#!/bin/bash
# ============================================================
# AutoRange Cyber Range — Full Installation Script
# Run as root on a fresh Ubuntu 22.04 VM on Proxmox
#
# Usage:
#   curl -sL https://raw.githubusercontent.com/arrach-imane/Cyber-Range-UCA/main/deploy/install.sh | bash
# or upload and run:
#   chmod +x install.sh && sudo ./install.sh
# ============================================================
set -e

REPO_URL="https://github.com/arrach-imane/Cyber-Range-UCA.git"
APP_DIR="/opt/cyberrange"
APP_USER="cyberrange"
DB_NAME="cyberrange"
DB_USER="cyberrange_user"
DB_PASS="CyberRange2026!"
DOMAIN=""   # leave empty to use IP, or set e.g. "cyberrange.youruniv.ma"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[x]${NC} $1"; exit 1; }

[ "$EUID" -ne 0 ] && err "Please run as root: sudo ./install.sh"

# ── detect VM IP ──────────────────────────────────────────────────────────
VM_IP=$(hostname -I | awk '{print $1}')
log "Detected VM IP: $VM_IP"

# ── 1. System update ──────────────────────────────────────────────────────
log "Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq

# ── 2. Install dependencies ───────────────────────────────────────────────
log "Installing system dependencies..."
apt-get install -y -qq \
    git curl wget gnupg2 ca-certificates \
    python3 python3-venv python3-dev python3-pip \
    mysql-server nginx \
    build-essential libssl-dev libffi-dev

# ── 3. Install Node.js 20 ─────────────────────────────────────────────────
log "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - -qq
apt-get install -y -qq nodejs

# ── 4. Create app user ────────────────────────────────────────────────────
log "Creating app user: $APP_USER"
id -u "$APP_USER" &>/dev/null || useradd -m -s /bin/bash "$APP_USER"

# ── 5. Clone repository ───────────────────────────────────────────────────
log "Cloning repository..."
rm -rf "$APP_DIR"
git clone "$REPO_URL" "$APP_DIR" -q
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

# ── 6. Setup MySQL ────────────────────────────────────────────────────────
log "Configuring MySQL..."
systemctl start mysql
systemctl enable mysql

mysql -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';"
mysql -e "GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

# ── 7. Backend setup ──────────────────────────────────────────────────────
log "Setting up Python backend..."
cd "$APP_DIR/platform/backend"

python3 -m venv venv
source venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt

# Write .env
cat > .env << EOF
DB_HOST=localhost
DB_PORT=3306
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASS

SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")

# Proxmox — UPDATE THESE with your real values
PROVISIONING_BACKEND=proxmox
PROXMOX_HOST=192.168.37.20
PROXMOX_USER=root@pam
PROXMOX_TOKEN_NAME=cyberrange
PROXMOX_TOKEN_VALUE=REPLACE_WITH_YOUR_TOKEN_VALUE
PROXMOX_NODE=pve1
PROXMOX_NODES=pve1:192.168.37.20,pve2:192.168.37.17,pve3:192.168.37.14
PROXMOX_VERIFY_SSL=false
EOF

chown "$APP_USER":"$APP_USER" .env
chmod 600 .env

# Run migrations and seed
sudo -u "$APP_USER" bash -c "cd $APP_DIR/platform/backend && source venv/bin/activate && python -c 'from app.database import Base, engine; Base.metadata.create_all(bind=engine); print(\"Tables created\")'  "
sudo -u "$APP_USER" bash -c "cd $APP_DIR/platform/backend && source venv/bin/activate && python -c 'import sys; sys.path.insert(0,\".\"); import app.seed' "

deactivate

# ── 8. Frontend build ─────────────────────────────────────────────────────
log "Building React frontend..."
cd "$APP_DIR/platform/frontend"

# Set API URL to the VM's IP
cat > .env.production << EOF
VITE_API_URL=http://${DOMAIN:-$VM_IP}
EOF

npm install -q
npm run build

# ── 9. Systemd service for backend ───────────────────────────────────────
log "Creating systemd service for backend..."
cat > /etc/systemd/system/cyberrange-backend.service << EOF
[Unit]
Description=AutoRange Cyber Range Backend
After=network.target mysql.service

[Service]
User=$APP_USER
WorkingDirectory=$APP_DIR/platform/backend
Environment="PATH=$APP_DIR/platform/backend/venv/bin"
ExecStart=$APP_DIR/platform/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable cyberrange-backend
systemctl start cyberrange-backend

# ── 10. Nginx config ──────────────────────────────────────────────────────
log "Configuring Nginx..."
cat > /etc/nginx/sites-available/cyberrange << EOF
server {
    listen 80;
    server_name ${DOMAIN:-$VM_IP};

    # Frontend (built static files)
    root $APP_DIR/platform/frontend/dist;
    index index.html;

    # SPA fallback — all routes go to index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
    }

    # API docs
    location /docs {
        proxy_pass http://127.0.0.1:8000/docs;
        proxy_set_header Host \$host;
    }
    location /openapi.json {
        proxy_pass http://127.0.0.1:8000/openapi.json;
    }

    client_max_body_size 20M;
}
EOF

ln -sf /etc/nginx/sites-available/cyberrange /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
systemctl enable nginx

# ── 11. Firewall ──────────────────────────────────────────────────────────
log "Configuring firewall..."
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS (for later)
ufw --force enable

# ── Done ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   AutoRange Cyber Range installed successfully!      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Platform URL : ${YELLOW}http://$VM_IP${NC}"
echo -e "  API Docs     : ${YELLOW}http://$VM_IP/docs${NC}"
echo ""
echo -e "${YELLOW}IMPORTANT — Edit the Proxmox token before using labs:${NC}"
echo -e "  sudo nano $APP_DIR/platform/backend/.env"
echo -e "  → Set PROXMOX_TOKEN_VALUE to your real token"
echo -e "  → Then restart: sudo systemctl restart cyberrange-backend"
echo ""
