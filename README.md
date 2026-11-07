# RoleFit Company Service

Company and recruiter profiles (FR-03). A recruiter edits their company's public profile and their own
recruiter profile; any signed-in user can read a company profile by id (job seekers see it on job pages).

Node 22, TypeScript, Express 5, PostgreSQL. REST on port **3008**. It is reached only through the
API Gateway, which verifies the Supabase token and forwards the identity as headers.

## Endpoints

| Route | Who | Meaning |
| --- | --- | --- |
| `GET /api/companies/me` | recruiter with a company | own company; a default profile if never saved |
| `PUT /api/companies/me` | recruiter with a company | create or replace the profile (name is fixed from signup) |
| `GET /api/companies/:id` | any signed-in user | one company, `404 COMPANY_NOT_FOUND` if unknown |
| `GET /api/recruiters/me` | recruiter with a company | own recruiter profile; empty defaults if never saved |
| `PUT /api/recruiters/me` | recruiter with a company | create or replace |
| `GET /health`, `GET /ready` | none | liveness; readiness (checks the database) |

Full details are in [API.md](API.md) and [openapi.yaml](openapi.yaml).

## Identity headers

The service trusts these headers because only the gateway can reach it (set by the gateway, never by the client):

| Header | Meaning |
| --- | --- |
| `X-User-Id` | Supabase user id (required) |
| `X-User-Role` | `recruiter` or `seeker` |
| `X-Company-Id` | recruiter's company id, e.g. `co-acme-1a2b3c` |
| `X-Company-Name` | company name typed at signup, URI-encoded |

## Run it

```bash
npm install
cp .env.example .env     # point DATABASE_URL at a PostgreSQL database
npm run dev              # applies migrations, then listens on :3008
npm test
npm run typecheck
```

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `3008` | HTTP port |
| `HOST` | `0.0.0.0` | bind address (`.env.example` uses `127.0.0.1` for local runs) |
| `DATABASE_URL` | required | PostgreSQL connection string |
| `DATABASE_SSL` | `false` | `true` to require TLS |
| `DATABASE_CA_FILE` | none | CA certificate for a hosted database |

Migrations in `migrations/` are applied on start (`npm run migrate` runs them alone).

With Docker, the service is started by `deploy/docker-compose.yml` in the API Gateway repo
(service `company`, database `rolefit_company`).

## Tests

`npm test` runs the HTTP tests against an in-memory repository; no database is needed.
