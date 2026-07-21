# Nexus

Nexus is a futuristic, 3D AI-powered project management system designed first for personal use and shaped so it can grow into a SaaS product without a rewrite.

The product has three layers:

- A reliable project-management core for projects, features, tasks, milestones, ideas, journals, time tracking, and analytics.
- A cinematic 3D experience where projects become stars, timelines become DNA strands, and progress shapes living cities.
- A zero-cost AI layer for next-task suggestions, risk detection, summaries, reports, daily briefings, and future optional provider integrations.

## Zero-Cost Rule

Nexus must cost `0` from Phase 1 through the final personal-use phase. Core functionality must use local code, open-source tools, self-hosted services, free tiers, and optional user-owned credentials. Paid AI or cloud services can exist only as disabled future adapters, never as required dependencies.

## Client/Server Layout

Nexus is a client/server monorepo with one controlled contract boundary:

- `apps/web` is the client: React, TypeScript, Vite, Three.js, React Three Fiber, TailwindCSS, and the browser-safe API client.
- `apps/api` is the server: FastAPI, SQLAlchemy, Alembic, authentication, authorization, tenant isolation, persistence, analytics, and integrations.
- `packages/shared` contains client-safe TypeScript contracts. It contains no database, secret, or server runtime code.
- `infra`: Docker Compose for PostgreSQL, Redis, API, and web.
- `docs`: product architecture, roadmap, and design system notes.

The client communicates with the server only through versioned `/api/v1` HTTP endpoints. The client never connects directly to PostgreSQL, Neon, SMTP, Firebase Admin, or server credentials.

Project execution blueprints, team assignments, and interface preferences are server-owned. See [`docs/client-server-architecture.md`](docs/client-server-architecture.md) for the authority matrix and browser-storage policy.

## Local Development

Install frontend dependencies:

```bash
npm install
```

Run the client from the repository root:

```bash
npm run dev:client
```

Install the server once:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e "apps/api[dev]"
```

Then run the server from the repository root:

```bash
npm run dev:server
```

Or use Docker:

```bash
docker compose -f infra/docker-compose.yml up --build
```

## Product Principle

The data model stays clean, testable, and SaaS-ready. The visual layer translates that data into cinematic experiences without duplicating business logic.
