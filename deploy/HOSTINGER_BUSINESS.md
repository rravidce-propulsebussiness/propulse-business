# Hostinger Business Node.js deployment

This deployment profile is for the temporary Hostinger Business Node.js host.
It keeps the production architecture portable so the project can later move to
the existing Docker/VPS topology without changing the application model.

## hPanel build settings

Use these values in **Websites -> Node.js -> Import from GitHub**:

- Framework preset: **Express**
- Branch while testing: **feature/hostinger-business-deployment**
- Branch after the pull request is merged: **main**
- Node version: **22.x**
- Root directory: **repository root** (leave it blank / do not use `backend`)

The root `package.json` intentionally orchestrates both applications:

1. Hostinger installs the root package.
2. `postinstall` installs locked backend and frontend dependencies.
3. `build` creates `frontend/dist`.
4. `start` launches the Express backend.
5. The Express backend serves the built frontend for browser routes while keeping
   `/api`, `/health`, `/uploads`, `/robots.txt`, and `/sitemap.xml`
   on their existing server routes.

## Hostinger Business runtime mode

Hostinger Business provides one Node.js web process, so scheduled work runs in
that web process temporarily:

```env
NODE_ENV=production
RUN_BACKGROUND_JOBS_IN_WEB=true
REQUIRE_BACKGROUND_WORKER=false
RUN_MIGRATIONS_ON_STARTUP=true
TRUST_PROXY=true
```

On the later VPS/Docker deployment, revert to the normal split runtime:

```env
RUN_BACKGROUND_JOBS_IN_WEB=false
REQUIRE_BACKGROUND_WORKER=true
RUN_MIGRATIONS_ON_STARTUP=false
```

and run the dedicated `worker` plus the one-off migration service from
`deploy/compose.yml`.

## Required production settings

Set the exact HTTPS Hostinger test URL first. When the custom domain is attached,
change all public-origin values together:

```env
PUBLIC_APP_URL=https://YOUR-HOSTINGER-TEST-DOMAIN
FRONTEND_URL=https://YOUR-HOSTINGER-TEST-DOMAIN
CORS_ORIGIN=https://YOUR-HOSTINGER-TEST-DOMAIN
VITE_PUBLIC_SITE_URL=https://YOUR-HOSTINGER-TEST-DOMAIN
VITE_API_URL=/api
```

Use the managed/external PostgreSQL configuration. Do not convert this project to
MySQL:

```env
DB_HOST=
DB_PORT=5432
DB_NAME=
DB_USER=
DB_PASSWORD=
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
DB_POOL_MAX=5
DB_IDLE_TIMEOUT_MS=30000
DB_CONNECTION_TIMEOUT_MS=10000
DB_STATEMENT_TIMEOUT_MS=30000
DB_IDLE_IN_TX_TIMEOUT_MS=60000
```

Also configure at minimum:

```env
JWT_SECRET=
GOOGLE_CLIENT_ID=
OPERATIONAL_MONITORING_ENABLED=true
HEALTH_CHECK_TIMEOUT_MS=2500
HTTP_REQUEST_TIMEOUT_MS=60000
HTTP_HEADERS_TIMEOUT_MS=15000
HTTP_KEEP_ALIVE_TIMEOUT_MS=5000
HTTP_MAX_REQUESTS_PER_SOCKET=1000
```

For uploads, prefer the external S3-compatible object-storage settings already
supported by the backend (Cloudflare R2 is suitable). Do not depend on ephemeral
Node.js application files for production uploads.

Payment, email, Telegram, storage, and other secrets remain server-side Hostinger
environment variables. Never commit them to GitHub.

## First deployment checks

After the build is live, verify:

- `/` renders the ProPulse frontend, not the Hostinger placeholder.
- `/health/live` returns status `ok`.
- `/health/ready` returns HTTP 200.
- `/robots.txt` and `/sitemap.xml` use the same public origin.
- login/session cookies work on the HTTPS origin.
- Admin pages load.
- one harmless API read works.
- background-job dependent features do not report a missing worker.

Only after the test deployment passes should this branch be merged into `main`
and the Hostinger Git deployment be switched back to `main`.
