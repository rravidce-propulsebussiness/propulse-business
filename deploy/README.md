# Docker deployment bundle

This bundle gives ProPulse one reproducible image for the backend/worker, one static
frontend reverse-proxy image, an explicit one-off migration service, and a shared
durable upload volume. PostgreSQL remains external/managed; it is intentionally not
embedded in the production Compose file.

Traffic topology:

```text
Internet
  |
TLS load balancer / Caddy / nginx on the host
  |
127.0.0.1:8080  (frontend container)
  |-- /, /assets/*          -> static Vite build
  |-- /api/*                -> backend:5000
  |-- /health*              -> backend:5000
  '-- /uploads/*            -> backend:5000

backend web  <----> managed PostgreSQL
worker       <----> managed PostgreSQL
backend + worker share the same durable upload volume
```

The frontend proxy keeps browser API calls same-origin, preserving the current
HttpOnly cookie + CSRF model. The backend is not published directly by Compose.

## Environment files

Copy one template to a secret path that is not committed:

```sh
cp deploy/env/staging.backend.env.example /secure/propulse-staging.env
cp deploy/env/production.backend.env.example /secure/propulse-production.env
```

Replace every placeholder. Staging and production must use separate databases,
JWT secrets, storage, payment credentials and public origins.

## Release order

For a release, export the exact Git commit and environment:

```sh
export DEPLOY_ENVIRONMENT=staging
export GIT_COMMIT_SHA="$(git rev-parse HEAD)"
export RELEASE_ID="staging-$(date -u +%Y%m%dT%H%M%SZ)"
export BACKEND_ENV_FILE=/secure/propulse-staging.env
# Exact public HTTPS origin used to build canonical/Open Graph metadata.
export PUBLIC_SITE_URL=https://staging.example.com

docker compose --env-file "$BACKEND_ENV_FILE" -f deploy/compose.yml --profile release build
docker compose --env-file "$BACKEND_ENV_FILE" -f deploy/compose.yml --profile release run --rm migrate
docker compose --env-file "$BACKEND_ENV_FILE" -f deploy/compose.yml up -d backend worker frontend
```

Run migrations before replacing web traffic. Both long-running backend processes
have startup migrations disabled by the Compose file.

The public container binds to `127.0.0.1:8080` by default. Terminate HTTPS in a
host/load-balancer layer and proxy to that port. Set `PUBLIC_BIND_ADDRESS=0.0.0.0`
only when the hosting network requires it and access is protected by a load
balancer/firewall.

After external HTTPS is live, use the GitHub **Release Promotion** workflow. It
verifies `/health/version`, readiness and the non-destructive deployed smoke tests.

## Scaling

The bundled named volume is appropriate for one Docker host. Before running web
containers on multiple hosts, move private proofs to S3-compatible object storage
and move public uploaded media to shared object storage or another shared durable
filesystem. Do not run independent local upload volumes behind a load balancer.

Keep the worker as a separate supervised process. PostgreSQL advisory locks protect
scheduled work from duplicate execution, but one worker is normally enough.


## Search engine metadata

Set `PUBLIC_SITE_URL` to the exact external HTTPS origin before building the frontend.
The production build generates route-specific HTML metadata and crawlable fallback
content for the public marketing routes. The frontend proxies `/robots.txt` and
`/sitemap.xml` to the backend; the backend uses `PUBLIC_APP_URL` (or `FRONTEND_URL`)
for their canonical origin. Keep those values aligned with `PUBLIC_SITE_URL`.

Private account, Admin, investment, Lead Partner and requirement-flow routes emit
`X-Robots-Tag: noindex, nofollow, noarchive` and are excluded from the sitemap.
