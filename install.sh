#!/usr/bin/env bash
# ==============================================================================
#  UAProxy Premium — Automated One-Line Production Installer
#  GitHub: https://github.com/AnatoliiNovyk/UAHProxy
# ==============================================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
PURPLE='\033[0;35m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
cat << "EOF"
  _   _    _    ____                       
 | | | |  / \  |  _ \ _ __ _____  ___   _ 
 | | | | / _ \ | |_) | '__/ _ \ \/ / | | |
 | |_| |/ ___ \|  __/| | | (_) >  <| |_| |
  \___//_/   \_\_|   |_|  \___/_/\_\\__, |
                                    |___/ 
      Enterprise HAProxy & Load Balancer Control Center
EOF
echo -e "${NC}"

# Check Root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}[ERROR] This installer script must be run as root (or with sudo).${NC}" 
   exit 1
fi

INSTALL_DIR="/opt/uaproxy"
REPO_URL="https://github.com/AnatoliiNovyk/UAHProxy.git"

echo -e "${PURPLE}[1/6] Detecting Operating System & Prerequisites...${NC}"
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo -e "${RED}[ERROR] Cannot detect operating system via /etc/os-release.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ OS Detected: ${NAME} (${VERSION_ID})${NC}"

# Install Docker & Git if missing
echo -e "${PURPLE}[2/6] Checking and installing Docker & Git...${NC}"
if ! command -v git &> /dev/null; then
    echo -e "${YELLOW}Installing git...${NC}"
    if [[ "$OS" =~ ^(ubuntu|debian)$ ]]; then
        apt-get update && apt-get install -y git curl openssl
    elif [[ "$OS" =~ ^(rhel|centos|rocky|almalinux|fedora)$ ]]; then
        yum install -y git curl openssl
    fi
fi

if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Installing Docker Engine...${NC}"
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
else
    echo -e "${GREEN}✓ Docker is already installed.${NC}"
fi

# Clone or Update Repository
echo -e "${PURPLE}[3/6] Fetching UAProxy codebase into ${INSTALL_DIR}...${NC}"
if [ -d "$INSTALL_DIR/.git" ]; then
    echo -e "${YELLOW}Updating existing installation...${NC}"
    cd "$INSTALL_DIR"
    git fetch origin main
    git reset --hard origin/main
else
    mkdir -p "$INSTALL_DIR"
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# Generate Secure Environment Secrets
echo -e "${PURPLE}[4/6] Generating cryptographically secure .env secrets...${NC}"
if [ ! -f "$INSTALL_DIR/.env" ]; then
    SECRET_KEY=$(openssl rand -hex 32)
    POSTGRES_PASS=$(openssl rand -hex 16)
    REDIS_PASS=$(openssl rand -hex 16)

    cat <<ENVEOF > "$INSTALL_DIR/.env"
PROJECT_NAME="UAProxy Premium Control Panel"
VERSION="1.0.0"
API_V1_STR="/api/v1"
SECRET_KEY="${SECRET_KEY}"
ACCESS_TOKEN_EXPIRE_MINUTES=1440
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=admin
INITIAL_ADMIN_EMAIL=admin@uaproxy.local

POSTGRES_SERVER=postgres
POSTGRES_PORT=5432
POSTGRES_USER=uaproxy
POSTGRES_PASSWORD=${POSTGRES_PASS}
POSTGRES_DB=uaproxy
DATABASE_URL=postgresql+asyncpg://uaproxy:${POSTGRES_PASS}@postgres:5432/uaproxy
REDIS_URL=redis://redis:6379/0
ENVEOF
    echo -e "${GREEN}✓ Generated fresh production .env configuration.${NC}"
fi

# Create Systemd Service for Auto-start
echo -e "${PURPLE}[5/6] Creating Systemd Service (uaproxy.service)...${NC}"
cat << 'SYSEOF' > /etc/systemd/system/uaproxy.service
[Unit]
Description=UAProxy Enterprise Load Balancer Manager
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/uaproxy
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
SYSEOF

systemctl daemon-reload
systemctl enable uaproxy.service

# Build & Launch Containers
echo -e "${PURPLE}[6/6] Building and Launching UAProxy Stack...${NC}"
docker compose up -d --build

# Get Host IP Address
HOST_IP=$(hostname -I | awk '{print $1}')
if [ -z "$HOST_IP" ]; then
    HOST_IP="127.0.0.1"
fi

echo -e "\n${GREEN}==============================================================================${NC}"
echo -e "${GREEN} 🎉 UAProxy Premium successfully installed and running!${NC}"
echo -e "${GREEN}==============================================================================${NC}"
echo -e "${CYAN} Web Dashboard:${NC}     http://${HOST_IP}:3000"
echo -e "${CYAN} REST API Docs:${NC}     http://${HOST_IP}:8000/docs"
echo -e "${CYAN} Default Login:${NC}     admin"
echo -e "${CYAN} Default Password:${NC}  admin"
echo -e "\n${YELLOW}Manage Service:${NC}"
echo -e "  systemctl status uaproxy"
echo -e "  cd /opt/uaproxy && docker compose logs -f"
echo -e "${GREEN}==============================================================================${NC}\n"
