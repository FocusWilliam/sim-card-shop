# SIM Card Shop - Claude Code Guide

## Project Overview
E-commerce platform for prepaid SIM card sales. NestJS backend + Next.js frontend, deployed on AWS EC2 via Docker.

## Commands
- `cd /opt/sim-card-shop` - Project root on EC2
- `npm run lint` - ESLint check (backend/)
- `npm test` - Jest unit tests (backend/)
- `npm run build` - NestJS build (backend/)
- `npm run build` - Next.js build (frontend/)

## Git Workflow
- **Never push directly to main** - always use feature branches
- Branch naming: `feature/xxx`, `fix/xxx`, `refactor/xxx`
- Flow: `feature/* → PR → dev → PR → main`
- CI runs on every push (lint, test, build, docker)
- Production deploys only when main is updated

## Architecture
```
frontend/          Next.js 14 + Tailwind + Zustand (TypeScript)
backend/           NestJS + Prisma + Redis (TypeScript)
  src/auth/        JWT authentication + RBAC (ADMIN/CUSTOMER)
  src/products/    Product CRUD + Redis caching
  src/orders/      Order lifecycle + card key assignment
  src/payments/    Stripe Checkout + test payment + webhook
  src/admin/       Dashboard, inventory, customers, order filtering
  src/common/      Prisma, Redis, Email services (global modules)
docker-compose.pull.yml   Production (pulls pre-built GHCR images)
docker-compose.yml        Local development (builds locally)
.github/workflows/        CI/CD pipeline
```

## Database (PostgreSQL via Prisma)
- Schema: `backend/prisma/schema.prisma`
- Tables: users, products, card_inventory, orders, order_items
- Migrations: `npx prisma migrate dev`
- Push schema: `npx prisma db push`

## Deployment
- CI builds Docker images → pushes to ghcr.io/focuswilliam/sim-card-shop-*
- EC2 pulls pre-built images (no build on server)
- Update: `sudo docker pull ghcr.io/focuswilliam/sim-card-shop-backend:production && sudo docker pull ghcr.io/focuswilliam/sim-card-shop-frontend:production && sudo docker compose -f docker-compose.pull.yml up -d && sudo docker restart simcard_nginx`

## Conventions
- TypeScript strict mode, no `any` in production code (test files excluded from lint)
- All API endpoints prefixed with `/api/`
- Admin endpoints require JWT + ADMIN role
- Use `class-validator` DTOs for request validation
- Redis cache TTL: 300s for product listings
- Commit messages: conventional commits (feat/fix/test/refactor)

## Environment Variables (backend)
DATABASE_URL, REDIS_HOST, REDIS_PORT, JWT_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM

## Testing
- Unit tests in `backend/test/*.spec.ts`
- Run: `cd backend && npm test`
- Coverage: `cd backend && npm run test:cov`
- Test files use relaxed typing (excluded from ESLint)
