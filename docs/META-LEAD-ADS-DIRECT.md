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

Configure these as server-side environment variables; never put tokens or app
secrets in the frontend, GitHub, or a spreadsheet.

- \`META_LEADS_APP_SECRET\`: App Secret for the Meta app configured for Lead Ads.
- \`META_LEADS_VERIFY_TOKEN\`: a random webhook verification secret of your choice.
- \`META_LEADS_ENCRYPTION_KEY\`: 32 random bytes, base64 encoded. One-time generation:
  \`openssl rand -base64 32\`
- \`META_LEADS_GRAPH_VERSION\`: default \`v25.0\`, may be changed to an approved current version.

**Persist the encryption key** across deploys. Changing it without re-encrypting
existing Page tokens makes connected Pages unusable.

## Meta setup

1. Open the Meta Developers app associated with the Pages and enable Marketing
   API / Lead Ads. Request the necessary Lead Ads permissions (notably
   \`leads_retrieval\`, Page management/metadata access as required), App Review
   and business verification when applicable.
2. Configure **Webhooks → Page → leadgen**, using the callback above and the
   same \`META_LEADS_VERIFY_TOKEN\` configured on the server. Configure the
   correct app secret in Hostinger for signed POST verification.
3. Give the app CRM access to the Page through Meta Business Settings → Leads
   Access, when the Page uses Leads Access Manager.
4. In ProPulse Admin or Lead Partner → Meta Lead Ads, connect the Page with
   its **Page access token** and numeric Page ID. The server verifies that
   token belongs to that Page and calls \`/{page-id}/subscribed_apps\` for
   the \`leadgen\` subscription. One Page belongs to one ProPulse owner.
5. Use the **Meta Lead Ads Testing Tool** to create a test submission and verify
   it appears in the correct inbox with \`received\` status. The webhook
   records the ID immediately; the worker fetches the form answers during
   its next 30-second tick. Meta delivery itself can be delayed.
6. Check \`/health/ready\`, backend logs and Meta app Lead Access permissions
   if events remain queued or failed. Failed retrievals retry with backoff
   up to 8 attempts; authorized Admins/Partners can retry from the inbox.

## Operational security

- Webhook POST requires \`X-Hub-Signature-256\` verified against the exact raw
  request bytes. Webhook verification challenges are constant-time checked.
- Page tokens are encrypted at rest with AES-256-GCM.
- The UI and listing API never return Page tokens.
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
