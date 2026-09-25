# Production deployment and verification

## Account permissions

| Account | Access |
| --- | --- |
| User (`business`) | User portal, membership and lead purchases |
| User with active Pro | User features plus investment APIs |
| Lead Partner (`lead_partner`) | Partner inventory, earnings and withdrawals |
| Admin (`admin`) | Administration and manual payment review |

Pro investment access requires an active user and a current active Pro membership.
Admin and Lead Partner accounts cannot invest. The legacy `requires_pro` setting
does not bypass this rule. Authentication checks current database roles and session
versions, rather than trusting the role claimed in a JWT.

## Runtime setup

1. Install Node.js 24 and PostgreSQL (CI also checks PostgreSQL 16).
2. Copy the example environment files into your deployment's secret/configuration
   store. Never commit real environment files. Set `NODE_ENV=production`, the five
   `DB_*` connection fields, a randomly generated `JWT_SECRET` of at least 32 bytes,
   `CORS_ORIGIN` to your exact HTTPS application origin, and `PUBLIC_APP_URL` to that
   same public URL. Configure Google OAuth and Resend for the deployed domain if used.
3. Use `TRUST_PROXY=false` for direct connections. Behind a reverse proxy, configure
   the actual trusted proxy address or hop count and prevent direct public access
   to the backend. Do not trust arbitrary forwarded client addresses.
4. Run `npm ci` in backend and frontend. Before starting the production backend,
   run `npm run check:production-env` from `backend`; treat any failure as a deploy
   blocker and review warnings deliberately. Build with `npm run build` in frontend,
   with `VITE_API_URL=/api`. Serve `frontend/dist` over HTTPS, use SPA fallback for
   frontend routes, and forward `/api`, `/health`, `/health/live`,
   `/health/ready`, and `/uploads` to the backend. Keep browser/API requests
   same-origin through `/api`; the current HttpOnly cookie and CSRF model is designed
   for that topology. Allow the API's 10 MB request body limit through the proxy;
   individual payment proof files are limited to 5 MB.
5. For a **new empty database**, run `npm run db:bootstrap` in backend. For an
   existing installation, take and verify a backup, then run `npm run db:migrate`.
   The server also runs pending migrations at startup. This release adds
   `investment_payment_drafts`; deploy its migration before sending checkout traffic.
6. Run `npm run create-admin` once with `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and
   `ADMIN_NAME`. Re-running this command resets that account's password. Remove
   bootstrap admin credentials from the long-running service environment afterward.
7. Run `npm start` in backend under a supervised service with automatic restart.
   Use `/health/live` as the process liveness probe and `/health/ready` as the
   readiness/database probe. `/health` remains an alias of readiness for compatibility.
   All health responses are non-cacheable. Do not use database readiness as an
   orchestrator liveness probe, otherwise a temporary PostgreSQL outage can cause a
   restart loop. Back up PostgreSQL and persist `backend/uploads`, including private
   company proofs. Multiple backend instances need shared upload storage; payment
   drafts themselves are database-backed.

## Manual payment operations

Configure and verify the receiving bank/UPI details in the admin portal before
accepting money. No Razorpay credentials are used by the manual checkout flow.
The customer submits a unique UTR/reference and a PNG, JPEG, WebP, or PDF proof.
An admin must reconcile the reference, amount and receiving account against the
actual bank record before approving. A proof upload alone does not establish receipt.

Investment drafts expire after 15 minutes before submission. They survive server
restarts and work across backend instances. Submission saves the investment,
payment reference and proof in one transaction; failures can be retried without
leaving an orphan investment. Concurrent retries reuse the same pending payment.
Submitted payments remain pending until review. Paid and rejected payments cannot
be approved again. Existing in-memory drafts from the previous application version
cannot be migrated; customers must restart those unsubmitted checkouts after deployment.

## Verification

Run `npm test` in backend, and `npm run lint`, `npm run test:source-graph`,
`npm run test:csv-security`, `npm run build`, and `npm run test:google-gis`
in frontend. Audit dependencies with `npm audit`.

Before promotion from staging, run the non-destructive deployed smoke test from
`backend`:

```sh
DEPLOY_BASE_URL=https://staging.example.com \
DEPLOY_APP_ORIGIN=https://staging.example.com \
npm run test:deployed
```

The smoke test checks HTTPS liveness/readiness, database connectivity, security
headers, the configured CORS origin, an authentication boundary, rejection of an
untrusted origin, and normal 404 handling. It does not create customer, payment or
investment records.

For database verification, create a **disposable** PostgreSQL database whose name
starts with `propulse_verify_` or `ci_`, set `DB_NAME` to it in the test process,
run `npm run db:bootstrap`, then run:

```sh
npm run test:production
npm run test:ledger
npm run test:payout
node scripts/check-payment-integrity.js
node scripts/check-investment-integrity.js
node scripts/check-investment-revenue-allocation.js
node scripts/check-investment-reinvestment-integrity.js
```

`test:production` creates test accounts and transactions and changes investment
settings. It deliberately refuses ordinary database names. Drop the disposable
database afterward; never point these fixture tests at customer data.

Release verification on 2026-09-25 covered fresh migrations, backend regressions,
actual PostgreSQL payment concurrency and rollback, role restrictions, Lead Partner
payout lifecycle, production-mode HTTP startup/security checks, frontend build and
Google GIS checks. Dependency audits returned no known vulnerabilities. Frontend
lint is clean with zero warnings and zero errors.

Before accepting live payments, verify the deployed HTTPS domain, email delivery,
backup restoration and the complete browser journey using your configured bank
details. Local tests do not verify hosting, live bank reconciliation, external
service credentials, or every screen in the browser.
