# Direct Meta Lead Ads integration

ProPulse Technologies uses a separate Meta Ads lead intake for **propulsetechnologies.online**.
This is not the Business OS WhatsApp integration and does **not** send leads to
Google Sheets. Existing Admin and Lead Partner Google Sheet automations are unchanged.

## Routes and visibility

- Meta webhook: GET/POST \`https://propulsetechnologies.online/api/meta-leads/webhook\`
- Admin: \`/admin/leads/meta\` (all connected Pages and all Meta submissions)
- Lead Partners: \`/lead-partner/meta-leads\` (only their own connected Pages/submissions)
- Incoming lead events are deduplicated by \`meta_leadgen_id\`, stored in
  \`meta_ads_leads\`, then fetched from Meta Graph API by the retryable worker.
- Submitted contact details and form answers are only in the ProPulse database.
  They are **not** written to an Admin or Partner Google Sheet.
- These are incoming Meta lead submissions, **not yet approved marketplace
  inventory**. Separate quality/consent and pricing checks must be completed
  before any lead is published/sold to other businesses.

## Hostinger backend environment variables

Configure all variables server-side in Hostinger, never in the frontend or GitHub:

- META_LEADS_APP_ID: numeric Meta App ID (needed for the Connect Facebook Page button).
- META_LEADS_APP_SECRET: secret from the same Meta app.
- META_LEADS_VERIFY_TOKEN: secure arbitrary webhook verification secret.
- META_LEADS_ENCRYPTION_KEY: 32 random bytes encoded in base64 (use \`openssl rand -base64 32\`).
- META_LEADS_GRAPH_VERSION: defaults to v25.0.
- META_LEADS_LOGIN_CONFIG_ID: optional Facebook Login for Business configuration ID.
  When set, Meta uses the permissions selected in that login configuration.

**Do not rotate the encryption key without a token migration**, otherwise the
encrypted Page tokens on existing connections can no longer be decrypted.

## Meta setup and one-click linking

1. Enable Facebook Login for Business and Lead Ads in the Meta Developers app.
   Request \`pages_show_list\`, \`pages_manage_metadata\`, \`leads_retrieval\`,
   and \`pages_read_engagement\`. Obtain Advanced Access / App Review and business
   verification as required for external Page owners. If you create a Facebook
   Login for Business configuration, use a User access-token configuration
   containing these exact permissions, and set META_LEADS_LOGIN_CONFIG_ID.
2. Enable Client OAuth Login and Web OAuth Login. Register this exact **Valid
   OAuth Redirect URI** in Facebook Login settings:
   \`https://propulsetechnologies.online/api/meta-leads/oauth/callback\`
3. In Webhooks → Page, subscribe to \`leadgen\` using the callback
   \`https://propulsetechnologies.online/api/meta-leads/webhook\` and the
   same META_LEADS_VERIFY_TOKEN from Hostinger.
4. If using Leads Access Manager, grant the app CRM access in Meta Business
   Settings → Leads Access for each relevant Page.
5. Open ProPulse Admin → Meta Lead Ads or Lead Partner → Meta Lead Ads. Click
   **Connect Facebook Page**, approve Page access on Facebook, return to
   ProPulse, and click **Link Page** alongside the Page to connect. ProPulse
   automatically retrieves the authorized Page ID and Page token through
   \`/me/accounts\` on the backend, verifies Page ownership, and subscribes
   it via \`/{page-id}/subscribed_apps\` with \`leadgen\`.
6. Create a test submission in the Meta Lead Ads Testing Tool and verify
   receipt in the correct inbox. Graph form-field retrieval happens via a
   retryable queue; Meta delivery itself may be delayed.
7. Inspect \`/health/ready\`, production logs and Lead Access permissions
   if incoming Meta lead events remain pending or fail.

Facebook authorization is a short-lived redirect-based flow with OAuth state
validation. The browser receives only Page names and numeric Page IDs. Facebook
user and Page access tokens never appear in JavaScript, URL query values back
to the frontend, or Google Sheets.

## Operational security

- Webhook POST requires \`X-Hub-Signature-256\` verified against the exact raw
  request bytes. Webhook verification challenges are constant-time checked.
- Page tokens are encrypted at rest with AES-256-GCM.
- The UI and listing API never return Page tokens.
- OAuth CSRF state and the temporary Page-selection session use AES-256-GCM
  encrypted, HttpOnly, SameSite=Lax cookies that expire after 5 and 10 minutes.
- Admin and Lead Partner sessions are checked again on Page selection; a user
  cannot link a Page obtained via someone else's Facebook authorization.
- The inbox is access-controlled by role and Page owner.
- Unconnected Page events are ignored. Disconnected Pages stop new ingestion
  locally. Removing the Meta app's Page subscription in Meta Business
  Settings may also be necessary.
- The webhook writes an idempotent queue record **before** returning 200.
  Database failures produce 503 so Meta can retry delivery.
- A background worker is required. In single-process Hostinger setups it runs
  when \`RUN_BACKGROUND_JOBS_IN_WEB=true\`. If web background jobs are disabled,
  run \`npm run worker\` as a supervised service.
- Customer information is sensitive. Avoid logging lead payloads or sharing
  Meta Leads with third parties without appropriate permissions and consent.

Local static checks: \`cd backend && node scripts/check-meta-leads-direct.js\`
