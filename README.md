# Nexus

Nexus is a futuristic, 3D AI-powered project management system designed first for personal use and shaped so it can grow into a SaaS product without a rewrite.

The product has three layers:

- A reliable project-management core for projects, features, tasks, milestones, ideas, journals, time tracking, and analytics.
- A cinematic 3D experience where projects become stars, timelines become DNA strands, and progress shapes living cities.
- A zero-cost AI layer for next-task suggestions, risk detection, summaries, reports, daily briefings, and future optional provider integrations.

## Zero-Cost Rule

Nexus must cost `0` from Phase 1 through the final personal-use phase. Core functionality must use local code, open-source tools, self-hosted services, free tiers, and optional user-owned credentials. Paid AI or cloud services can exist only as disabled future adapters, never as required dependencies.

## Current Status

This repository is the first production-grade scaffold:

- `apps/web`: React, TypeScript, Vite, Three.js, React Three Fiber, Drei, Framer Motion, GSAP, TailwindCSS, and a shadcn-inspired local UI layer.
- `apps/api`: FastAPI, SQLAlchemy 2, Alembic, JWT-ready auth helpers, domain models, analytics services, and AI service boundaries.
- `packages/shared`: shared TypeScript domain types for frontend contracts.
- `infra`: Docker Compose for PostgreSQL, Redis, API, and web.
- `docs`: product architecture, roadmap, and design system notes.

## Local Development

Install frontend dependencies:

```bash
npm install
```

Run the web app:

```bash
npm run dev:web
```

Run the API from `apps/api` after installing Python dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

Or use Docker:

```bash
docker compose -f infra/docker-compose.yml up --build
```

## Product Principle

The data model stays clean, testable, and SaaS-ready. The visual layer translates that data into cinematic experiences without duplicating business logic.
