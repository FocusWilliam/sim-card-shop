# 📱 SIM Card Shop

A full-stack e-commerce platform for prepaid SIM card sales with automated card-key fulfillment, Stripe payment integration, and email notifications.

**Live Demo:** http://3.16.157.181

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Zustand |
| Backend | NestJS 10, TypeScript, Prisma ORM, Passport JWT, Stripe SDK, Nodemailer |
| Database | PostgreSQL 16 (Docker), Redis 7 (caching & sessions) |
| DevOps | Docker, Nginx, GitHub Actions CI/CD, GitHub Container Registry (GHCR) |
| Cloud | AWS EC2 (t2.micro) |

## Architecture

```
User Browser
    │
    ▼
AWS EC2 (Docker)
    │
    ├── Nginx (reverse proxy, port 80)
    │     ├── /        → Next.js frontend (port 3000)
    │     └── /api/*   → NestJS backend (port 3001)
    │
    ├── NestJS API
    │     ├── PostgreSQL (Prisma ORM)
    │     ├── Redis (product cache, TTL-based)
    │     ├── Stripe (payment checkout + webhooks)
    │     └── Nodemailer (SMTP email notifications)
    │
    └── CI/CD: GitHub Actions → Build Docker → Push GHCR → SSH Deploy
```

## Features

- **Product catalog** with pricing, data/validity tags, and quantity selection
- **Shopping cart** with client-side state management (Zustand)
- **Order system** with auto-generated order numbers and email/order-number lookup
- **Card-key inventory** — atomic assignment within database transactions on fulfillment
- **Stripe Checkout** integration with webhook-based async payment confirmation
- **Test payment** endpoint for development without Stripe credentials
- **Email notifications** — sends card keys to buyer via SMTP (Gmail/SES/any provider)
- **Admin API** — dashboard stats, inventory tracking (sold/available per SKU), customer analytics
- **JWT authentication** with role-based access control (ADMIN/CUSTOMER roles)
- **Redis caching** on product queries with TTL-based invalidation
- **Docker containerized** with pre-built image deployment (no build on server)
- **CI/CD pipeline** — lint → test → Docker build → push to GHCR → SSH deploy to EC2

## Project Structure

```
sim-card-shop/
├── backend/                    # NestJS API
│   ├── src/
│   │   ├── auth/              # JWT authentication & RBAC
│   │   │   ├── auth.service.ts        # Register, login, JWT token generation
│   │   │   ├── jwt.strategy.ts        # Passport JWT strategy
│   │   │   ├── jwt-auth.guard.ts      # Auth guard
│   │   │   └── roles.guard.ts         # Roles decorator & guard (ADMIN/CUSTOMER)
│   │   ├── products/          # Product CRUD with Redis cache
│   │   ├── orders/            # Order creation, lookup by orderNo or email
│   │   ├── payments/          # Stripe checkout, webhooks, test payment
│   │   ├── admin/             # Dashboard stats, inventory, customer analytics
│   │   └── common/            # Prisma, Redis, Email services (global modules)
│   ├── prisma/
│   │   └── schema.prisma      # 5 tables: User, Product, CardInventory, Order, OrderItem
│   └── Dockerfile             # Multi-stage: dev → build → production
├── frontend/                   # Next.js 14 App
│   ├── src/
│   │   ├── app/               # Pages: home, /cart, /orders
│   │   ├── components/        # ProductCard, CartBar
│   │   └── lib/               # Axios API client, Zustand cart store
│   └── Dockerfile
├── nginx/default.conf          # Reverse proxy: / → frontend, /api → backend
├── docker-compose.yml          # Local development (build from source)
├── docker-compose.pull.yml     # Production (pull pre-built images from GHCR)
├── deploy.sh                   # One-click EC2 deployment script
└── .github/workflows/deploy.yml  # CI/CD: feature/* → dev → main
```

## API Endpoints

### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/products | List all active products (cached) |
| GET | /api/products/:id | Product detail with available stock |
| POST | /api/orders | Create an order |
| GET | /api/orders/:orderNo | Lookup order by order number |
| GET | /api/orders/lookup/email?email=x | Lookup all orders by email |
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login, returns JWT |
| GET | /api/auth/profile | Current user profile (requires JWT) |

### Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/payments/checkout/:orderId | Create Stripe Checkout session |
| POST | /api/payments/webhook | Stripe webhook handler |
| POST | /api/payments/simulate/:orderId | Test payment (instant fulfillment) |

### Admin (requires JWT + ADMIN role)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/products | Create product |
| PUT | /api/products/:id | Update product |
| DELETE | /api/products/:id | Deactivate product |
| POST | /api/orders/:id/fulfill | Manually fulfill order |
| GET | /api/admin/dashboard | Revenue, order counts, inventory stats |
| GET | /api/admin/inventory | Per-product sold/available card counts |
| GET | /api/admin/orders | Filter orders by status/email |
| GET | /api/admin/customers | Customer list with spending totals |

## Quick Start (Local Development)

```bash
git clone https://github.com/FocusWilliam/sim-card-shop.git && cd sim-card-shop
cp .env.example .env
docker compose up -d
# Wait for services, then:
docker exec simcard_backend npx prisma db push
docker exec simcard_backend npm run prisma:seed
```

- Frontend: http://localhost:3000
- API Docs (Swagger): http://localhost:3001/api/docs
- Admin: admin@simcard.shop / admin123

## Production Deployment (AWS EC2)

The production setup uses **pre-built Docker images** from GitHub Container Registry — no compilation happens on the server, keeping memory usage under 500MB.

### First-time Setup

```bash
# SSH into EC2 (Ubuntu)
# Install Docker
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2 git
sudo systemctl enable docker

# Clone and deploy
cd /opt && sudo git clone https://github.com/FocusWilliam/sim-card-shop.git && cd sim-card-shop

# Login to GHCR and pull images
echo "YOUR_GHCR_TOKEN" | sudo docker login ghcr.io -u focuswilliam --password-stdin
sudo docker compose -f docker-compose.pull.yml pull
sudo docker compose -f docker-compose.pull.yml up -d

# Initialize database
sudo docker exec simcard_backend npx prisma db push --skip-generate
```

### CI/CD Auto-Deploy

Every merge to `main` triggers: lint → test → Docker build → push to GHCR → SSH deploy.

GitHub Actions Secrets required:
- `EC2_HOST` — EC2 public IP
- `EC2_USER` — `ubuntu`
- `EC2_SSH_KEY` — PEM file contents
- `GHCR_TOKEN` — GitHub PAT with `read:packages` scope

### Git Branching Strategy

```
feature/* → PR → dev (staging) → PR → main (production)
```

- `feature/*` branches: daily development, CI runs lint & test
- `dev`: integration branch, auto-deploys to staging on merge
- `main`: production, protected branch, only merged via PR

### Email Configuration (Optional)

Add SMTP environment variables to `docker-compose.pull.yml` backend section:

```yaml
SMTP_HOST: smtp.gmail.com
SMTP_PORT: "587"
SMTP_USER: your@gmail.com
SMTP_PASS: your-gmail-app-password
SMTP_FROM: your@gmail.com
```

### Stripe Configuration (Optional)

Add to backend environment:

```yaml
STRIPE_SECRET_KEY: sk_test_xxx
STRIPE_WEBHOOK_SECRET: whsec_xxx
```

## License

MIT
