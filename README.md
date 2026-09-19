# Cloover solar pre-qualification

An authenticated user describes a household and the solar system they want. The
service prices the installation, grades the application into a risk band,
and returns three instalment offers over 5, 10 and 15 years.

- **Web app** — Next.js 16 (App Router, React 19, Tailwind 4)
- **API** — NestJS 12 on Node 24, Postgres 17 through Prisma 7
- **Shared** — one package of Zod schemas and response types used by both sides

## Quick start

Prerequisites: Docker with Compose. Nothing else.

```bash
cp .env.example .env
docker compose up -d --build
```

The stack starts Postgres, applies migrations, seeds demo data and serves the
app at <http://localhost:3000>. The API listens on
<http://localhost:3001/api> and publishes an interactive reference at
<http://localhost:3001/api/docs>.

Seeded accounts:

| Email            | Password        | Role  |
| ---------------- | --------------- | ----- |
| `admin@test.com` | `Admin123!pass` | Admin |
| `user@test.com`  | `User123!pass`  | User  |
| `mia@test.com`   | `User123!pass`  | User  |

Stop with `docker compose down`, or `docker compose down -v` to discard the
database as well.

## Running without Docker

Node 24 and pnpm 12 are required; only Postgres comes from Docker.

```bash
cp .env.example .env
pnpm install
docker compose up -d db                       # Postgres on :5432

pnpm --filter @cloover/contracts build        # shared types the apps import
pnpm --filter @cloover/api exec prisma generate
pnpm --filter @cloover/api exec prisma migrate deploy
pnpm --filter @cloover/api exec prisma db seed

pnpm dev                                      # API on :3001, web on :3000
```

## Tests

```bash
pnpm test:unit                                # 92 tests, no database needed

docker compose --profile test up -d db-test   # throwaway Postgres on :5433
pnpm test:e2e                                 # 41 tests against a real database
```

Unit tests cover the pricing engine, the shared schemas, password hashing, the
persistence-to-contract mapper and the React components. Integration tests
drive the running application over HTTP with supertest: registration, sign-in,
session handling, quote creation, ownership and the administrator views.

The integration suite runs against its own database, whose data lives in
memory, so a test run cannot touch development data. It applies the committed
migrations rather than pushing the schema, so a migration that fails to apply
fails the build instead of the deployment.

Other commands: `pnpm lint`, `pnpm typecheck`, `pnpm format`, and
`pnpm --filter @cloover/api test:cov` for coverage.

## The pricing model

**System price** is a flat €1,200 per kilowatt of capacity. A 6 kW array is
€7,200.

**Principal** is what is actually borrowed: the price minus any down payment.
Interest is charged on this alone.

**Risk band** is a coarse credit grade. A household that already uses a lot of
electricity but wants a modest system is the safest borrower, because the
savings comfortably cover the instalment.

| Band | Condition                                | Rate  |
| ---- | ---------------------------------------- | ----- |
| A    | 400 kWh or more per month and up to 6 kW | 6.9%  |
| B    | otherwise, 250 kWh or more per month     | 8.9%  |
| C    | everything else                          | 11.9% |

**Offers** apply the standard amortisation formula to the principal, where `i`
is the monthly rate and `n` the number of payments:

```
monthlyPayment = principal × i ÷ (1 − (1 + i)^−n)
```

A worked example, for 450 kWh per month, a 6 kW system and €1,200 down:

```
system price   6 × 1200          = 7,200.00 EUR
principal      7200 − 1200       = 6,000.00 EUR
risk band      450 ≥ 400, 6 ≤ 6  = A
rate           band A            = 6.9%

term     monthly     total repaid    interest
 5 yr     118.52        7,111.20      1,111.20
10 yr      69.36        8,323.20      2,323.20
15 yr      53.59        9,646.20      3,646.20
```

A longer term lowers the monthly payment and raises the total cost. That
trade-off is the whole point of showing three offers side by side.

Two cases the specification leaves open are handled explicitly. A down payment
above the system price is rejected, because the formula has no meaning for a
negative principal. A down payment equal to the price yields offers with a zero
monthly payment rather than a division by zero.

## API reference

[`docs/api.md`](docs/api.md) is the written reference. The running API also
serves generated OpenAPI at `/api/docs` (interactive) and `/api/docs-json`
(the raw document).

The OpenAPI request schemas are derived from the same Zod schemas that validate
incoming requests, so the published documentation cannot describe a rule the
API does not enforce.

## Layout

```
apps/api              NestJS API
  src/quotes          pricing engine, quote endpoints, admin reads
  src/auth            registration, sign-in, JWT strategy, guards
  src/common          validation pipe, error filter, logging, decorators
  src/health          liveness and readiness probes
  prisma              schema, migrations, seed
apps/web              Next.js app
  src/app             routes: (auth) sign-in pages, (app) signed-in pages
  src/components      forms, tables, UI primitives
  src/lib             server-side API client and session helpers
packages/contracts    Zod schemas, response types, money helpers
```

## Design decisions

**A separate NestJS API rather than Next.js route handlers.** The exercise is
assessed partly on modularisation and boundaries, and a real network boundary
between the web app and the API makes those boundaries explicit rather than
conventional. NestJS supplies the conventional structure for that: modules,
controllers, services, guards. It also covers the health probes, structured
logging and OpenAPI generation with well-trodden packages instead of bespoke
code. The cost is more ceremony than a single Next app would need.

**One repository.** The API contract and the code on both sides of it change
together, and a single commit keeps them consistent. Two repositories would add
release coordination with nothing to show for it at this size.

**One set of validation rules.** `@cloover/contracts` holds the Zod schemas the
browser and the API both use. Client-side validation is a convenience and the
server revalidates everything, but the two can no longer disagree about what is
acceptable. The system price has a single definition there as well, so the
down payment bound the browser enforces is exactly the number the server
computes.

**JWT in an httpOnly cookie.** Storing a token anywhere page scripts can read
it means any cross-site scripting bug is also a session compromise. The browser
talks only to the Next.js origin, which forwards to the API, so the cookie is
first-party: no CORS preflight, no `SameSite=None`.

**Authorisation enforced in the API.** A global guard authenticates every route
unless it opts out with `@Public()`, so a newly added endpoint is closed rather
than open by default. Administrator routes carry the role requirement on the
controller. The web app hides what a user cannot use, but hiding is never what
protects it.

**404, not 403, for someone else's quote.** Answering "forbidden" would confirm
that an identifier exists. Both cases return "not found".

**No floating point in the database.** Money is stored in integer cents and
system size in integer watts. Repeated arithmetic on binary floats drifts, and
a financing quote cannot drift. Conversion to the units people read happens in
one mapper.

**Quotes record how they were priced.** Inputs and derived values are stored
side by side with a `pricingVersion`. When the rates change, an already issued
offer can still be explained.

**Migrations run as a job, not at server start.** Two replicas starting
together would otherwise race to migrate the same database.

**Liveness and readiness are separate.** `/api/health` answers whether the
process is alive; `/api/health/ready` additionally checks the database. If
liveness checked the database, a brief outage would restart every container
instead of taking them out of the load balancer.

## Trade-offs

**A single session token, not a refresh pair.** The token lasts a day and
cannot be revoked before it expires, other than by deleting the account. Short
access tokens with rotating refresh tokens are the right production answer and
are the first thing I would add.

**The JWT strategy re-reads the user on every request.** That is one indexed
lookup per call. In exchange, a deleted account or a changed role takes effect
immediately rather than whenever the token expires.

**Numbers are coerced in the shared schema.** HTML controls emit strings and
JSON clients emit numbers, so one schema coerces both. The API therefore
accepts `"6"` where it could insist on `6`. A single set of rules on both sides
was worth more than that strictness.

**The admin page renders an explanation rather than a 403.** The API returns
403; the page shows a clear message with a 200. Returning a real status from a
Next page needs an experimental API I did not want to depend on.

**The API image is 536MB.** Installing the runtime tree fresh with `--prod`
already took it down from 905MB, by leaving out the Prisma CLI, Studio, the
query engines and the TypeScript compiler that a pruned dev install pulls in
through optional peer dependencies. Bundling the server and moving to an Alpine
base would cut it further.

**No rate limiting.** Sign-in is unthrottled, which is not acceptable in
production.

## What I would do next

1. Refresh token rotation, and rate limiting on the authentication endpoints.
2. An end-to-end browser test with Playwright covering sign-in, quote creation
   and viewing the result.
3. An amortisation schedule per offer, and a PDF export of a quote.
4. Pagination controls on the personal quote list, which currently fetches up
   to fifty.
5. Structured audit events for quote creation, which a lender needs for
   compliance rather than for debugging.
6. An identity provider. The token verification sits behind the Passport
   strategy, so adding Keycloak means swapping the JWT strategy for one that
   validates against the realm's JWKS endpoint, mapping the subject onto a
   local user row and realm roles onto the application role. Nothing outside
   `src/auth` would change.

## Deployment

**Where.** Cloud Run on GCP. Both services are stateless containers that
already listen on a port from the environment, which is exactly what Cloud Run
expects, and it scales to zero between demos. Cloud SQL for Postgres sits
behind them, reached over the Cloud SQL connector, with the JWT secret and the
database password in Secret Manager. GKE would mean operating a cluster for two
containers, and App Engine gives less control over the image for no benefit
here.

**How.** The workflow in `.github/workflows/ci.yml` runs three jobs on every
pull request: lint, types, formatting and unit tests without a database;
integration tests against a real Postgres service container; and a build of
both production images. A deployment workflow would extend it on `main` by
pushing the images to Artifact Registry tagged with the commit, running
migrations as a Cloud Run job, then deploying a new revision with traffic
shifted gradually and rolled back automatically on health-check failure.
Migrations stay a separate step from the deployment precisely so a schema
change and a code change can be sequenced.
