#!/bin/bash
set -e

echo "============================================"
echo "  SIM Card Shop - One-Click Cloud Setup"
echo "  (Pull Mode - no local build needed)"
echo "============================================"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check for GHCR token
GHCR_TOKEN="${1:-$GHCR_TOKEN}"
if [ -z "$GHCR_TOKEN" ]; then
    echo -e "${RED}Usage: bash deploy.sh <github_personal_access_token>${NC}"
    echo "Generate one at: https://github.com/settings/tokens/new"
    echo "Required scope: read:packages"
    exit 1
fi

# 1. Install Docker
echo -e "${YELLOW}[1/5] Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    sudo apt-get update -qq
    sudo apt-get install -y -qq docker.io docker-compose-v2 git
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker $USER
    echo -e "${GREEN}✅ Docker installed${NC}"
else
    echo -e "${GREEN}✅ Docker already installed${NC}"
fi

# 2. Clone repo
echo -e "${YELLOW}[2/5] Cloning repository...${NC}"
cd /opt
if [ -d "sim-card-shop" ]; then
    cd sim-card-shop && git pull origin main
    echo -e "${GREEN}✅ Repository updated${NC}"
else
    sudo git clone https://github.com/FocusWilliam/sim-card-shop.git
    sudo chown -R $USER:$USER sim-card-shop
    cd sim-card-shop
    echo -e "${GREEN}✅ Repository cloned${NC}"
fi

# 3. Login to GHCR and pull images
echo -e "${YELLOW}[3/5] Pulling pre-built images from GitHub Container Registry...${NC}"
echo "$GHCR_TOKEN" | sudo docker login ghcr.io -u focuswilliam --password-stdin
sudo docker compose -f docker-compose.pull.yml pull
echo -e "${GREEN}✅ Images pulled${NC}"

# 4. Start services
echo -e "${YELLOW}[4/5] Starting services...${NC}"
sudo docker compose -f docker-compose.pull.yml up -d --remove-orphans
echo -e "${GREEN}✅ Services started${NC}"

# Wait for backend to be ready
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 15

# 5. Run migrations and seed
echo -e "${YELLOW}[5/5] Setting up database...${NC}"
sudo docker exec simcard_backend npx prisma db push --skip-generate 2>&1 || true
sudo docker exec simcard_backend npm run prisma:seed 2>&1 || true

# Get public IP
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com 2>/dev/null || curl -s http://ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  🎉 Deployment Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "  🌐 Frontend:   ${YELLOW}http://${PUBLIC_IP}${NC}"
echo -e "  📚 API Docs:   ${YELLOW}http://${PUBLIC_IP}/api/docs${NC}"
echo -e "  👤 Admin:      admin@simcard.shop / admin123"
echo ""
echo -e "  Check status:  sudo docker compose -f docker-compose.pull.yml ps"
echo -e "  View logs:     sudo docker compose -f docker-compose.pull.yml logs -f"
echo ""
