# API reference

Base URL `http://localhost:3001/api` when running with Docker Compose. The
browser reaches the same routes at `http://localhost:3000/api`, which the
Next.js server forwards.

A generated, interactive version of this reference is served at `/api/docs`,
and the raw OpenAPI document at `/api/docs-json`. Both are produced from the
same Zod schemas that validate incoming requests.

## Conventions

**Money** is expressed in euros in every request and response. It is stored
internally in integer cents.

**Rates** appear twice on each offer: `apr` as a decimal fraction (`0.069`) and
`aprPercent` as a percentage (`6.9`).

**Authentication** uses a session cookie, `cloover_session`, set by
`/auth/register` and `/auth/login`. It is `HttpOnly`, `SameSite=Lax`, and
`Secure` when `COOKIE_SECURE=true`. Scripted clients may instead send
`Authorization: Bearer <token>` with the same token.

**Errors** always share one shape:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "requestId": "4c41eadf-ed48-4498-9723-c7399278d905",
  "fieldErrors": [{ "field": "systemSizeKw", "message": "System size must be at least 0.1 kW" }]
}
```

`fieldErrors` is present only for validation failures. `requestId` matches the
`x-request-id` response header and the structured logs, so a user report can be
traced to one request. Supply your own `x-request-id` and it is used instead of
a generated one.

| Status | Meaning                                                       |
| ------ | ------------------------------------------------------------- |
| 400    | The request failed validation, or an identifier is not a UUID |
| 401    | No valid session                                              |
| 403    | Signed in, but the role is insufficient                       |
| 404    | No such resource, or it belongs to another user               |
| 409    | The email is already registered                               |

## Endpoints

| Method | Path                   | Auth  | Purpose                               |
| ------ | ---------------------- | ----- | ------------------------------------- |
| POST   | `/auth/register`       | —     | Create an account and start a session |
| POST   | `/auth/login`          | —     | Exchange credentials for a session    |
| POST   | `/auth/logout`         | —     | Clear the session cookie              |
| GET    | `/auth/me`             | User  | Return the signed-in user             |
| POST   | `/quotes`              | User  | Price a request and store the result  |
| GET    | `/quotes`              | User  | List the caller's own quotes          |
| GET    | `/quotes/{id}`         | User  | Fetch one quote                       |
| GET    | `/admin/quotes`        | Admin | List every user's quotes              |
| GET    | `/admin/quotes/owners` | Admin | List users who have requested quotes  |
| GET    | `/health`              | —     | Liveness probe                        |
| GET    | `/health/ready`        | —     | Readiness probe                       |

---

### POST /auth/register

```json
{ "fullName": "Ada Lovelace", "email": "ada@example.com", "password": "Password123!" }
```

`fullName` 2 to 120 characters, `password` 8 to 128. The email is lowercased
and must be unique.

**201** returns `{ "user": { "id", "email", "fullName", "role" } }` and sets the
session cookie. **409** if the email is taken.

### POST /auth/login

```json
{ "email": "ada@example.com", "password": "Password123!" }
```

**200** with the same body as registration. **401** for a wrong password and,
identically, for an unknown email, so the endpoint cannot be used to discover
which addresses are registered.

### POST /auth/logout

**204**, cookie cleared. Safe to call without a session.

### GET /auth/me

**200** with `{ "user": … }`. **401** when the session is missing, expired,
tampered with, or belongs to a deleted account.

---

### POST /quotes

```json
{
  "fullName": "Ada Lovelace",
  "email": "ada@example.com",
  "address": "Hauptstrasse 1, 10115 Berlin",
  "monthlyConsumptionKwh": 450,
  "systemSizeKw": 6,
  "downPayment": 1200
}
```

| Field                   | Rules                                         |
| ----------------------- | --------------------------------------------- |
| `fullName`              | 2 to 120 characters                           |
| `email`                 | valid address, lowercased                     |
| `address`               | 5 to 255 characters                           |
| `monthlyConsumptionKwh` | whole number, 1 to 100,000                    |
| `systemSizeKw`          | 0.1 to 100                                    |
| `downPayment`           | optional, 0 or more, at most the system price |

The quote is filed against the signed-in user regardless of the email in the
body. Capacity is stored as whole watts and the price computed from that
rounded figure, so a stored quote always reprices to the number it was issued
at.

**201**:

```json
{
  "id": "01a0b708-bd4b-76b8-9d05-794b754254d2",
  "createdAt": "2026-09-19T00:19:58.412Z",
  "input": {
    "fullName": "Ada Lovelace",
    "email": "ada@example.com",
    "address": "Hauptstrasse 1, 10115 Berlin",
    "monthlyConsumptionKwh": 450,
    "systemSizeKw": 6,
    "downPayment": 1200
  },
  "derived": {
    "systemPrice": 7200,
    "downPayment": 1200,
    "principal": 6000,
    "riskBand": "A",
    "apr": 0.069,
    "aprPercent": 6.9,
    "pricingVersion": "2026-01-flat-1200"
  },
  "offers": [
    {
      "termYears": 5,
      "apr": 0.069,
      "aprPercent": 6.9,
      "principalUsed": 6000,
      "monthlyPayment": 118.52,
      "numberOfPayments": 60,
      "totalPaid": 7111.2,
      "totalInterest": 1111.2
    },
    {
      "termYears": 10,
      "monthlyPayment": 69.36,
      "totalPaid": 8323.2,
      "totalInterest": 2323.2,
      "…": "…"
    },
    {
      "termYears": 15,
      "monthlyPayment": 53.59,
      "totalPaid": 9646.2,
      "totalInterest": 3646.2,
      "…": "…"
    }
  ]
}
```

Offers are always returned for 5, 10 and 15 years, in ascending order.

### GET /quotes

Query: `page` (default 1), `pageSize` (default 20, maximum 100).

**200**:

```json
{
  "items": [
    {
      "id": "…",
      "createdAt": "2026-09-19T00:19:58.412Z",
      "systemSizeKw": 6,
      "systemPrice": 7200,
      "riskBand": "A",
      "apr": 0.069,
      "aprPercent": 6.9
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1,
  "totalPages": 1
}
```

Newest first, and only the caller's own quotes.

### GET /quotes/{id}

**200** with the full quote. An administrator additionally receives `owner`
with the requesting user's id, name and email.

**404** when the quote does not exist _or_ belongs to another user. **400**
when `id` is not a UUID.

### GET /quotes/{id}/schedule

Query: `termYears`, which must be 5, 10 or 15.

**200**:

```json
{
  "quoteId": "01a0b708-bd4b-76b8-9d05-794b754254d2",
  "termYears": 10,
  "apr": 0.069,
  "aprPercent": 6.9,
  "principal": 6000,
  "monthlyPayment": 69.36,
  "totalPaid": 8322.88,
  "totalInterest": 2322.88,
  "rows": [
    {
      "period": 1,
      "payment": 69.36,
      "interest": 34.5,
      "principal": 34.86,
      "remainingBalance": 5965.14
    },
    { "period": 120, "payment": 69.43, "interest": 0.4, "principal": 69.03, "remainingBalance": 0 }
  ]
}
```

One row per instalment, so 60, 120 or 180 of them. `remainingBalance` on the
final row is always `0`: the monthly payment is rounded to whole cents, and the
last instalment absorbs the remainder. `totalPaid` here is therefore the exact
figure, which differs by a few cents from the offer's `monthlyPayment` times
the number of payments.

A fully prepaid quote has nothing to finance and returns an empty `rows` array.

**400** for a term that is not offered. **404** when the quote does not exist or
belongs to another user.

### GET /quotes/{id}/pdf

Query: `termYears`, optional. Supplying 5, 10 or 15 appends that offer's full
payment schedule to the document.

**200** with `Content-Type: application/pdf` and
`Content-Disposition: attachment; filename="cloover-quote-<short id>.pdf"`.

The document is rendered from the stored quote, not recomputed, so it always
matches the figures shown on screen. Ownership is enforced by the same reads
the JSON endpoints use.

**400** for a term that is not offered. **404** when the quote does not exist
or belongs to another user.

---

### GET /admin/quotes

Requires the `ADMIN` role. Query: `page`, `pageSize`, plus

- `search` — matches the owner's name or email, case-insensitive substring
- `userId` — restricts to one owner, must be a UUID

**200** with the same page shape as `/quotes`, each item carrying `owner`.
**403** for a signed-in non-administrator, **401** when anonymous.

### GET /admin/quotes/owners

**200** with the users who have at least one quote, ordered by name, for the
filter dropdown:

```json
[{ "id": "…", "fullName": "Mia Fischer", "email": "mia@test.com" }]
```

---

### GET /health

Liveness. **200** `{ "status": "ok", "uptimeSeconds": 110 }` whenever the
process is running. It deliberately does not touch the database: an
orchestrator restarts a container that fails liveness, and a brief database
outage should not restart the fleet.

### GET /health/ready

Readiness, including a database round trip.

```json
{
  "status": "ok",
  "info": { "database": { "status": "up", "responseTime": 12 } },
  "error": {},
  "details": { "database": { "status": "up", "responseTime": 12 } }
}
```

**503** while a dependency is unavailable, which takes the instance out of the
load balancer without restarting it.
