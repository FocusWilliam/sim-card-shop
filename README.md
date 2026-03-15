# 📱 SIM Card Shop

A full-stack e-commerce platform for prepaid SIM card sales, built with enterprise-grade technologies.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, Zustand |
| Backend | NestJS, TypeScript, Prisma ORM, Passport JWT |
| Database | PostgreSQL 16, Redis 7 |
| DevOps | Docker, Nginx, GitHub Actions CI/CD |
| Cloud | AWS EC2, RDS, S3, CloudFront, Lambda |

## Architecture

```
Client → CloudFront (CDN) → Nginx → Next.js (SSR)
                                  → NestJS API → PostgreSQL
                                              → Redis (Cache)
                                              → Lambda (Payment Webhooks)
```

## Quick Start (Local Development)

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for running outside Docker)

### 1. Clone & Configure

```bash
git clone <repo-url> && cd sim-card-shop
cp .env.example .env
```

### 2. Start All Services

```bash
docker compose up -d
```

This starts: PostgreSQL, Redis, NestJS backend (port 3001), Next.js frontend (port 3000).

### 3. Run Database Migrations & Seed

```bash
docker exec -it simcard_backend npx prisma migrate dev --name init
docker exec -it simcard_backend npm run prisma:seed
```

### 4. Open

- Frontend: http://localhost:3000
- API Docs (Swagger): http://localhost:3001/api/docs
- Admin login: `admin@simcard.shop` / `admin123`

## Project Structure

```
sim-card-shop/
├── backend/                  # NestJS API
│   ├── src/
│   │   ├── auth/            # JWT authentication & RBAC
│   │   ├── products/        # Product CRUD with Redis cache
│   │   ├── orders/          # Order management & card fulfillment
│   │   └── common/          # Prisma & Redis services
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── seed.ts          # Sample data
│   └── Dockerfile
├── frontend/                 # Next.js App
│   ├── src/
│   │   ├── app/             # Pages (App Router)
│   │   ├── components/      # React components
│   │   └── lib/             # API client, stores
│   └── Dockerfile
├── nginx/                    # Reverse proxy config
├── .github/workflows/        # CI/CD pipeline
├── docker-compose.yml        # Local development
└── docker-compose.prod.yml   # Production deployment
```

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/products | List products | Public |
| GET | /api/products/:id | Product detail | Public |
| POST | /api/products | Create product | Admin |
| PUT | /api/products/:id | Update product | Admin |
| DELETE | /api/products/:id | Deactivate product | Admin |
| POST | /api/orders | Create order | Public |
| GET | /api/orders/:orderNo | Lookup order | Public |
| POST | /api/orders/:id/fulfill | Fulfill order | Admin |
| POST | /api/auth/register | Register | Public |
| POST | /api/auth/login | Login | Public |
| GET | /api/auth/profile | User profile | Auth |

## Production Deployment (AWS)

### EC2 Setup

```bash
# On EC2 instance (Amazon Linux 2 / Ubuntu)
sudo yum install -y docker git
sudo systemctl start docker
sudo usermod -aG docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone and deploy
cd /opt
git clone <repo-url> sim-card-shop && cd sim-card-shop
cp .env.example .env  # Edit with production values
docker compose -f docker-compose.prod.yml up -d
```

### GitHub Actions Secrets

Set these in your repo Settings > Secrets:
- `EC2_HOST` - EC2 public IP
- `EC2_USER` - SSH username (ec2-user / ubuntu)
- `EC2_SSH_KEY` - Private SSH key

## Next Steps

- [ ] Integrate Stripe / Alipay payment
- [ ] Add AWS Lambda for payment webhooks
- [ ] Set up S3 + CloudFront for static assets
- [ ] Add admin dashboard (product/order management)
- [ ] Email notifications via AWS SES
- [ ] Monitoring with CloudWatch

## License

MIT
