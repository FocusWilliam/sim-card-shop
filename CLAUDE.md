# SIM Card Shop - Claude Code Instructions

## Project Overview
E-commerce platform for prepaid SIM card sales. Full-stack: NestJS backend + Next.js frontend + PostgreSQL + Redis.

## Commands
- `cd backend && npm run lint` - Lint backend
- `cd backend && npm test` - Run unit tests (38 test cases)
- `cd backend && npm run build` - Build NestJS
- `cd frontend && npm run lint` - Lint frontend
- `cd frontend && npm run build` - Build Next.js
- `docker compose -f docker-compose.pull.yml ps` - Check running services
- `docker compose -f docker-compose.pull.yml logs backend --tail=20` - Backend logs

## Architecture
- frontend/ = Next.js 14, TypeScript, Tailwind, Zustand, App Router
- backend/ = NestJS, TypeScript, Prisma ORM, Redis cache, JWT auth
- backend/src/auth/ = JWT auth + RBAC (roles.guard.ts)
- backend/src/products/ = Product CRUD + Redis cache
- backend/src/orders/ = Order lifecycle + email lookup
- backend/src/payments/ = Stripe + test payment + card fulfillment
- backend/src/admin/ = Dashboard API (stats, inventory, customers)
- backend/src/common/ = Prisma, Redis, Email services
- backend/prisma/schema.prisma = Database schema (5 tables)
- backend/test/ = Unit tests (Jest)

## Git Workflow
- main = production (protected, only merge via PR)
- dev = staging
- feature/* = development branches
- Always create feature branch: git checkout -b feature/xxx
- Push triggers CI (lint, test, build, deploy)

## Deployment
- CI builds Docker images and pushes to ghcr.io
- EC2 pulls pre-built images (never build on EC2, it only has 1GB RAM)
- Update command: docker pull ghcr.io/focuswilliam/sim-card-shop-backend:production && docker pull ghcr.io/focuswilliam/sim-card-shop-frontend:production && docker compose -f docker-compose.pull.yml up -d && docker restart simcard_nginx

## Conventions
- TypeScript strict mode, no any in src/ (test/ is relaxed via eslintignore)
- Use Link from next/link (not a tags) for client-side navigation
- API paths: relative /api in frontend (nginx proxies to backend)
- Prisma binaryTargets: include linux-musl-openssl-3.0.x for Alpine
- Backend production entry: dist/src/main (not dist/main)
- Commit messages: conventional commits (feat/fix/test/docs)
- No package-lock.json: use npm install not npm ci everywhere
- Frontend useSearchParams() must be wrapped in Suspense
- Docker image tags must be lowercase
