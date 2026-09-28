# Staging and controlled release promotion

ProPulse uses a provider-neutral GitHub Actions release gate in
`.github/workflows/release-promotion.yml`. It verifies the exact Git commit on
staging before production can run. Configure required reviewers on the GitHub
`production` Environment before live promotion.

## Deployment topology

A concrete provider-neutral Docker topology is available in `deploy/README.md` and `deploy/compose.yml`. It runs the static frontend/reverse proxy, backend web service and dedicated worker separately, keeps PostgreSQL external/managed, uses an explicit one-off migration service, and shares durable upload storage between web and worker. Use it directly on a Docker host or as the reference topology when mapping services to a managed platform.

## Isolated environments

Create separate staging and production web/frontend, worker, PostgreSQL and storage
resources. Never point staging at the production database, production upload
volume/S3 bucket, or production payment credentials. For Razorpay, keep the existing
Admin payment switch disabled in staging unless staging uses test-mode credentials.

Both deployed environments should run `NODE_ENV=production`. Set:

```env
DEPLOY_ENVIRONMENT=staging
RUN_MIGRATIONS_ON_STARTUP=false
RUN_BACKGROUND_JOBS_IN_WEB=false
REQUIRE_BACKGROUND_WORKER=true
```

Use `DEPLOY_ENVIRONMENT=production` in production. The host must expose the exact
commit through `GIT_COMMIT_SHA`, `RENDER_GIT_COMMIT`,
`VERCEL_GIT_COMMIT_SHA`, `RAILWAY_GIT_COMMIT_SHA`,
`HEROKU_SLUG_COMMIT`, `SOURCE_VERSION`, or `COMMIT_SHA`. Map any other
provider variable into `GIT_COMMIT_SHA`.

`/health/version` exposes only non-secret release identity and is used by the gate
to prevent testing one commit and deploying another.

## GitHub Environments

Create Environments named exactly `staging` and `production`.

For each, configure:

```text
APP_URL=https://real-environment-domain
```

Optional variables:

```text
DEPLOY_WAIT_SECONDS=600
DEPLOY_HOOK_METHOD=POST
```

Optional secret:

```text
DEPLOY_HOOK_URL=<provider/orchestrator deploy hook>
```

If no deploy hook is set, the workflow waits for your hosting platform/operator to
deploy the selected commit. On the `production` Environment, enable required
reviewers so the production job cannot start until staging passes and approval is
granted.

## Migration responsibility

Your deploy hook/provider release command should run migrations once before new web
instances receive traffic:

```sh
cd backend
npm ci
npm run check:production-env
npm run db:migrate
```

Then start web and worker with `RUN_MIGRATIONS_ON_STARTUP=false` and
`RUN_MIGRATIONS_ON_WORKER_STARTUP=false`. Never run staging migrations against
production.

## Promotion flow

Open **Actions → Release Promotion → Run workflow** and select the Git ref you intend
to ship. Choose **staging** to verify staging only, or **production** to verify
staging first and then wait for production approval.

The gate runs an optional deployment hook, waits for the exact commit and expected
environment, requires `/health/ready`, then runs the existing non-destructive
deployed smoke suite. The smoke suite does not create customer, lead, payment or
investment records.

For rollback, deploy a previously known-good Git commit through the same gate.
Database rollback is not automatic; use backward-compatible migrations and an
expand/migrate/contract plan for destructive schema changes.
