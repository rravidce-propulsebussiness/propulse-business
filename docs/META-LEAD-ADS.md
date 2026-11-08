# Meta Lead Ads (Facebook & Instagram) → ProPulse

Leads from Facebook/Instagram lead forms go **directly** into ProPulse through
the Meta API. No Google Sheet is involved and nothing polls: Meta pushes each
new lead to ProPulse the moment it is submitted.

```
Lead form submitted ──► Meta webhook (leadgen) ──► ProPulse fetches the lead
                       ──► same lead rules as uploads/sheets (duplicates,
                           quality gate, partner pricing) ──► lead created
```

Who can connect: **Admin** (Admin → Leads → Sheets → *Meta Lead Ads*) and
**Lead Partners** (Inventory → *Meta Lead Ads* tab). A lead form can feed only
one account at a time.

## 1. Server settings (Hostinger → Propulse app → Environment)

| Setting | Value |
|---|---|
| `META_APP_ID` | Same Meta app ID Business OS uses |
| `META_APP_SECRET` | Same Meta app secret Business OS uses |
| `META_LEADS_WEBHOOK_VERIFY_TOKEN` | Any random text, 16+ characters |
| `META_TOKEN_ENCRYPTION_KEY` | 32 random bytes, base64 — `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |

Optional: `META_GRAPH_API_VERSION` (default `v25.0`),
`META_LEADS_LOGIN_CONFIG_ID` (Facebook Login for Business configuration ID;
if set it replaces the scope list), `META_LEADS_PUBLIC_ORIGIN` (only if the
site is not `https://propulsetechnologies.online`).

If the earlier integration's names are already set on Hostinger (`META_LEADS_APP_ID`, `META_LEADS_APP_SECRET`, `META_LEADS_VERIFY_TOKEN`, `META_LEADS_ENCRYPTION_KEY`, `META_LEADS_GRAPH_VERSION`), they are used automatically.

Keep `META_TOKEN_ENCRYPTION_KEY` safe and unchanged — changing it means
everyone must reconnect Meta.

## 2. Meta app (developers.facebook.com → the Business OS app)

1. **Facebook Login for Business** → Settings → Valid OAuth Redirect URIs:
   `https://propulsetechnologies.online/api/meta-leads/oauth/callback`
2. **Webhooks** → object **Page** → Callback URL
   `https://propulsetechnologies.online/api/meta-leads/webhook`, Verify token =
   `META_LEADS_WEBHOOK_VERIFY_TOKEN` → subscribe to the **leadgen** field.
   (This is separate from the WhatsApp webhook Business OS uses; it does not
   change Business OS.)
3. **App Review** → request advanced access for `leads_retrieval`,
   `pages_manage_metadata`, `pages_manage_ads`, `pages_show_list`, `pages_read_engagement` and
   `business_management`. Until approved, only people with a role on the
   app (admins/developers/testers) can connect; partners can connect after.
4. In Meta **Leads Access Manager** (Business Settings → Integrations →
   Leads Access), make sure the ProPulse app is allowed for each Page.

## 3. Connecting a form

1. Click **Connect Meta**, log in, and share the Pages that run lead ads.
2. Choose the Page and lead form → **Analyze form** → check the field mapping
   (name, phone, email, city, pincode map automatically).
3. **Connect this lead form**. Leads from the last 30 days are imported in the
   background; new leads arrive in real time.
4. Once a form is connected here, remove its old Google Sheet connection so
   the sheet stops being re-checked every 5 minutes.

Pincode: ask for pincode (or locality) in the Meta form. If only a locality
is given, ProPulse fills the pincode when that locality maps to exactly one
pincode; a city alone (e.g. "Hyderabad") is not enough.

## 4. Troubleshooting

- **Not set up**: a server setting above is missing (the admin panel lists it).
- **Leads not arriving**: check the Page webhook subscription (step 2) and
  Leads Access Manager (step 2.4); then use **Import last 30 days**.
- **"Reconnect Meta"** errors: the Page access was revoked or expired — click
  *Reconnect / add Pages*.
- Every lead is processed once (tracked by Meta lead ID), so retries and
  re-imports never create duplicates.
