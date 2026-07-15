#!/bin/bash
set -e

APP_DIR="/opt/cyberrange"
APP_USER="cyberrange"
DB_NAME="cyberrange"
DB_USER="cyberrange_user"
DB_PASS=$(python3 -c "import secrets; print(secrets.token_urlsafe(24))")
GITHUB_USER="arrach-imane"
GITHUB_REPO="Cyber-Range-UCA"

# Accept token via env var or first argument:
#   sudo GITHUB_TOKEN=ghp_xxx bash deploy/install.sh
#   sudo bash deploy/install.sh ghp_xxx
GITHUB_TOKEN="${GITHUB_TOKEN:-$1}"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[x]${NC} $1"; exit 1; }

[ "$EUID" -ne 0 ] && err "Run as root: sudo bash deploy/install.sh"
[ -z "$GITHUB_TOKEN" ] && err "GitHub token required. Usage: sudo GITHUB_TOKEN=ghp_xxx bash deploy/install.sh"

# Build authenticated clone URL (token never written to disk)
REPO_URL="https://${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${GITHUB_REPO}.git"

VM_IP=$(hostname -I | awk '{print $1}')
log "VM IP: $VM_IP"

log "Updating packages..."
apt-get update -y
apt-get upgrade -y

log "Installing dependencies..."
apt-get install -y git curl wget gnupg2 ca-certificates \
    python3 python3-venv python3-dev python3-pip \
    mysql-server nginx \
    build-essential libssl-dev libffi-dev

log "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

log "Creating app user..."
id -u "$APP_USER" &>/dev/null || useradd -m -s /bin/bash "$APP_USER"

log "Cloning repository..."
rm -rf "$APP_DIR"
git clone "$REPO_URL" "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

log "Configuring MySQL..."
systemctl start mysql
systemctl enable mysql
mysql -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';"
mysql -e "GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

log "Setting up Python backend..."
cd "$APP_DIR/backend"
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")

cat > .env <<ENVEOF
DB_HOST=localhost
DB_PORT=3306
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASS}
SECRET_KEY=${SECRET}
PROVISIONING_BACKEND=proxmox
PROXMOX_HOST=192.168.37.20
PROXMOX_USER=root@pam
PROXMOX_TOKEN_NAME=cyberrange
PROXMOX_TOKEN_VALUE=REPLACE_WITH_YOUR_TOKEN_VALUE
PROXMOX_NODE=pve1
PROXMOX_NODES=pve1:192.168.37.20,pve2:192.168.37.17,pve3:192.168.37.14
PROXMOX_VERIFY_SSL=false
ENVEOF

chown "$APP_USER:$APP_USER" .env
chmod 600 .env

log "Creating database tables..."
python3 -c "from app.database import Base, engine; Base.metadata.create_all(bind=engine); print('Tables OK')"

log "Seeding database..."
python3 -c "import sys; sys.path.insert(0,'.'); import app.seed"

deactivate

log "Building frontend..."
cd "$APP_DIR/frontend"
npm install
npm run build

log "Creating systemd service..."
cat > /etc/systemd/system/cyberrange-backend.service <<SVCEOF
[Unit]
Description=AutoRange Cyber Range Backend
After=network.target mysql.service

[Service]
User=${APP_USER}
WorkingDirectory=${APP_DIR}/backend
Environment=PATH=${APP_DIR}/backend/venv/bin:/usr/bin:/bin
ExecStart=${APP_DIR}/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable cyberrange-backend
systemctl start cyberrange-backend

log "Configuring Nginx..."
cat > /etc/nginx/sites-available/cyberrange <<NGXEOF
server {
    listen 80;
    server_name _;

    root ${APP_DIR}/frontend/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_read_timeout 300;
    }

    location /docs {
        proxy_pass http://127.0.0.1:8000/docs;
    }

    location /openapi.json {
        proxy_pass http://127.0.0.1:8000/openapi.json;
    }

    # Proxmox WebSocket (vncwebsocket) — must be before the general /proxmox/ block
    location ~ ^/proxmox/api2/json/nodes/[^/]+/qemu/[0-9]+/vncwebsocket {
        proxy_pass https://192.168.37.20:8006;
        proxy_http_version 1.1;
        proxy_set_header Host 192.168.37.20:8006;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_ssl_verify off;
        proxy_read_timeout 3600;
        proxy_send_timeout 3600;
        proxy_buffering off;
    }

    # Proxmox general reverse proxy (UI + API)
    location /proxmox/ {
        proxy_pass https://192.168.37.20:8006/;
        proxy_http_version 1.1;
        proxy_set_header Host 192.168.37.20:8006;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_ssl_verify off;
        proxy_read_timeout 3600;
        proxy_send_timeout 3600;
        proxy_buffering off;
    }

    client_max_body_size 20M;
}
NGXEOF

ln -sf /etc/nginx/sites-available/cyberrange /etc/nginx/sites-enabled/cyberrange
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
systemctl enable nginx

log "Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  AutoRange installed successfully!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "  URL      : ${YELLOW}http://${VM_IP}${NC}"
echo -e "  API docs : ${YELLOW}http://${VM_IP}/docs${NC}"
echo ""
echo -e "${YELLOW}Next step — add your Proxmox token:${NC}"
echo "  sudo nano ${APP_DIR}/backend/.env"
echo "  Set PROXMOX_TOKEN_VALUE and PROXMOX_PASSWORD to your cluster credentials"
echo "  Then: sudo systemctl restart cyberrange-backend"
echo ""
echo -e "${YELLOW}MySQL credentials (saved in ${APP_DIR}/backend/.env):${NC}"
echo "  DB_USER=${DB_USER}"
echo "  DB_PASSWORD=${DB_PASS}"
echo ""
