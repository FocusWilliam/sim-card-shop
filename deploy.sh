#!/bin/bash
set -e

echo "============================================"
echo "  SIM Card Shop - One-Click Cloud Setup"
echo "============================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Install Docker
echo -e "${YELLOW}[1/6] Installing Docker...${NC}"
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
echo -e "${YELLOW}[2/6] Cloning repository...${NC}"
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

# 3. Create .env
echo -e "${YELLOW}[3/6] Configuring environment...${NC}"
cat > .env << 'ENVEOF'
DB_USER=simcard
DB_PASSWORD=SimCard_Prod_2025!
DB_NAME=simcard_shop
DATABASE_URL=postgresql://simcard:SimCard_Prod_2025!@postgres:5432/simcard_shop
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=sc-jwt-prod-a7f3b2e1d9c8
NEXT_PUBLIC_API_URL=/api
PUBLIC_API_URL=/api
FRONTEND_URL=*
ENVEOF
echo -e "${GREEN}✅ Environment configured${NC}"

# 4. Fix docker-compose for single-server deployment
echo -e "${YELLOW}[4/6] Preparing deployment config...${NC}"

# Create a combined docker-compose that works out of the box
cat > docker-compose.cloud.yml << 'DCEOF'
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: simcard_db
    environment:
      POSTGRES_USER: simcard
      POSTGRES_PASSWORD: SimCard_Prod_2025!
      POSTGRES_DB: simcard_shop
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U simcard']
      interval: 5s
      timeout: 5s
      retries: 5
    restart: always

  redis:
    image: redis:7-alpine
    container_name: simcard_redis
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 5s
      retries: 5
    restart: always

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: development
    container_name: simcard_backend
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://simcard:SimCard_Prod_2025!@postgres:5432/simcard_shop
      REDIS_HOST: redis
      REDIS_PORT: 6379
      JWT_SECRET: sc-jwt-prod-a7f3b2e1d9c8
      PORT: 3001
      FRONTEND_URL: '*'
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: always

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: development
    container_name: simcard_frontend
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001/api
    depends_on:
      - backend
    restart: always

  nginx:
    image: nginx:alpine
    container_name: simcard_nginx
    ports:
      - '80:80'
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - frontend
      - backend
    restart: always

volumes:
  postgres_data:
  redis_data:
DCEOF
echo -e "${GREEN}✅ Deployment config ready${NC}"

# 5. Build and start
echo -e "${YELLOW}[5/6] Building and starting services (this takes 2-3 minutes)...${NC}"
sudo docker compose -f docker-compose.cloud.yml up -d --build 2>&1

# Wait for backend to be ready
echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 15

# 6. Run migrations and seed
echo -e "${YELLOW}[6/6] Setting up database...${NC}"
sudo docker exec simcard_backend npx prisma migrate dev --name init --skip-generate 2>&1 || true
sudo docker exec simcard_backend npx prisma db push 2>&1
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
echo -e "  Check status:  sudo docker compose -f docker-compose.cloud.yml ps"
echo -e "  View logs:     sudo docker compose -f docker-compose.cloud.yml logs -f"
echo ""
