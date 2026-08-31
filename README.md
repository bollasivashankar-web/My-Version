# Staffinix

Staffinix is a multi-tenant staffing operations platform built with React, TypeScript, TanStack
Start, and Supabase. Candidate, requirement, client, vendor, submission, and tenant data is
persistent; production routes do not fall back to fixture or process-memory business data.

## Runtime architecture

```text
Browser
  -> TanStack Start routes and React Query
  -> authenticated TanStack server functions
      -> Supabase Auth + tenant-scoped Postgres/RLS
      -> server-only AI gateway
      -> private document-processing worker -> ClamAV

Scheduled Nitro task
  -> candidate embedding refresh -> Supabase/Postgres
```

The browser receives only the Supabase publishable key. Authentication, authorization, AI
credentials, privileged database operations, audit writes, and document-processing credentials stay
on the server. Row-level security remains the final tenant boundary for requests made with a user's
session.

Authentication has one path:

```text
Browser -> Supabase Auth -> signed JWT -> authenticated server function -> Postgres RLS
```

There is no application-managed auth service, fallback account, locally constructed user, automatic
signup during login, or browser-assigned role/tenant. The browser session is used only to transport
the Supabase access token; the backend verifies that token and loads the active profile and roles
from the database on every protected boundary.

### Source layout

```text
src/
  components/                 UI and feature components
  hooks/                      session, tenancy, profile, and UI hooks
  integrations/http/          request-size enforcement
  integrations/supabase/      browser/server clients and auth middleware
  lib/                        authenticated server functions and domain services
  routes/                     TanStack Router route modules
tasks/                        scheduled server tasks
workers/document-processor/   isolated untrusted-document parser and malware scan boundary
supabase/migrations/          versioned database, RLS, storage, and RPC changes
supabase/tests/               adversarial database and query-plan tests
scripts/                      release-time architecture and security guards
```

## Production invariants

- Every protected server function authenticates the caller; role changes and platform operations
  also enforce explicit server-side RBAC.
- Password and OAuth login call Supabase Auth directly. Failed authentication terminates the flow,
  and an authenticated account without an active application profile is immediately signed out.
- Tenant-owned rows are protected by RLS and integrity guards. Cross-tenant access is tested with
  adversarial SQL cases.
- Production bundles fail closed if fixture imports are reintroduced.
- The service-role/secret key is rejected from browser configuration and checked against built
  client bundles.
- Collection endpoints are bounded. Dashboard metrics are produced by one tenant-scoped aggregate
  RPC instead of loading business rows into the application server.
- AI responses have a hard deadline, a byte ceiling, and caller-provided schema validation.
- Resume uploads use canonical tenant/candidate paths. Untrusted PDF/DOCX processing occurs outside
  the web process and rejects active content, archive traversal, zip bombs, oversized files, and
  unsafe extracted text.
- Submission transitions and candidate graph creation use database transactions rather than
  partial multi-request writes.
- Public errors are normalized, while structured request logs contain request IDs and allowlisted
  metadata only.

## Required configuration

For the web application:

| Variable                        | Scope         | Purpose                                          |
| ------------------------------- | ------------- | ------------------------------------------------ |
| `VITE_SUPABASE_URL`             | Browser       | Supabase project URL                             |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser       | Supabase publishable key; never use a secret key |
| `SUPABASE_URL`                  | Server        | Supabase project URL                             |
| `SUPABASE_PUBLISHABLE_KEY`      | Server        | Publishable key used with the caller's session   |
| `LOVABLE_API_KEY`               | Server        | AI gateway credential                            |
| `DOCUMENT_PROCESSOR_URL`        | Server        | Private URL for the document worker              |
| `DOCUMENT_PROCESSOR_TOKEN`      | Server/worker | Shared secret of at least 32 random characters   |

The document worker also requires `CLAMAV_HOST`; `CLAMAV_PORT` defaults to `3310` and `PORT`
defaults to `8788`. See [workers/document-processor/README.md](workers/document-processor/README.md)
for its isolation and resource-limit requirements.

## Local development

Use Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Run the main application checks with:

```sh
npm run lint
npm run build
npm run test:auth
npm run test:input-validation
npm run test:error-taxonomy
npm run test:observability
npm run test:candidate-updates
npm run test:resume-paths
npm run test:document-worker
npm run test:ai-gateway
npm run test:rbac
npm run test:list-bounds
npm run security:server-auth
npm run security:auth-bypass
npm run security:auth-bypass-bundle
npm run security:production-fallbacks
npm run security:service-role-bundle
```

The GitHub release gate also starts an isolated Supabase stack and runs the database, storage,
transaction, and tenant-isolation tests before deployment. Migrations under `supabase/migrations/`
are the only supported way to change shared database state.
