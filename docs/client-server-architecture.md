# Client/Server Architecture

Nexus is a client/server application. The browser presents and edits data; the FastAPI
service authorizes, validates, stores, and computes it.

## Runtime Boundary

| Concern | Client (`frontend`) | Server (`backend`) |
| --- | --- | --- |
| Rendering and interaction | React, R3F, responsive UI | No |
| Authentication state | Short-lived access token in session storage; refresh cookie is HTTP-only | Identity verification, session revocation, roles |
| Durable project data | Reads and writes through `/api/v1` | PostgreSQL/Neon source of truth |
| Goals, steps, and teams | Editing experience | Validation, tenant isolation, persistence, audit log |
| Preferences | Applies returned values to the UI | Per-user persistence |
| Analytics and guidance | Presentation | Rollups and deterministic intelligence |
| Secrets and providers | Never stored or used directly | Environment-only adapters |

Every durable route is versioned under `/api/v1`, requires an authenticated context, and
filters records by the active workspace. Write routes additionally enforce role permissions.

## Browser Storage Policy

`sessionStorage` may contain only resumable, short-lived client session state. Durable project
or account data must not be written to browser storage.

`legacyStateMigration.ts` is the only exception. It is a transitional, read-once bridge for
older Nexus installs: it reads known legacy keys, sends their content through validated API
routes, and removes each key only after the server confirms persistence. It is not a fallback
database.

## Development and Production

Local development may use the server's in-memory adapter, preserving the same HTTP contract
without infrastructure cost. Production requires `NEXUS_AUTH_BACKEND=database` and uses the
SQLAlchemy/PostgreSQL implementation. This keeps development at zero cost without changing
the production architecture.

## Change Rule

New durable features must include:

1. A server model or explicit server-side adapter.
2. An authenticated, tenant-scoped API contract.
3. Client API mapping with no direct database/provider access.
4. Validation and isolation tests.
5. An Alembic migration when the relational schema changes.
