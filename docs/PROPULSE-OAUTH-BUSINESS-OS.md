# ProPulse identity provider for Business OS (OAuth 2.0)

The legacy ProPulse platform at `https://propulsetechnologies.online` remains its own application with its existing PostgreSQL, login passwords and HTTP-only `propulse_auth` session cookie.

## Security model

- This application serves OAuth 2.0 authorization-code + **mandatory PKCE S256** through `/api/oauth/authorize`, `/api/oauth/token` and `/api/oauth/userinfo`.
- Only a **single confidential client**, `PROPULSE_OAUTH_CLIENT_ID`, can authorize. The callback URL must match `PROPULSE_OAUTH_REDIRECT_URI` **exactly**, which must be a Supabase Auth HTTPS callback.
- `PROPULSE_OAUTH_CLIENT_SECRET` is server-side only, never set as a `VITE_*` or `NEXT_PUBLIC_*` variable. It must be random and at least 32 characters.
- Codes expire in three minutes, are stored as SHA-256 hashes, are consumed once in PostgreSQL using `DELETE ... RETURNING`, and are bound to a client, callback, auth version, and PKCE challenge.
- Scoped bearer tokens expire in five minutes; only `openid email profile` user information is exposed. Neither ProPulse JWTs nor roles are sent to Business OS.
- Only users with **independently verified email ownership** can issue codes. Legacy ProPulse password signup is **not** proof of email ownership. A completed password-reset email link or a Google-authenticated session verifies email and records `users.email_verified_at`. Existing passwords are never shared.
- Existing ProPulse login and Google login remain intact. If already logged in, authorization proceeds using the HttpOnly cookie. If not, the user is sent to the existing `/login` and returned to the validated **same-origin** `/api/oauth/authorize` request.

## Deployment setup

1. Deploy migrations in the ProPulse repository, including `20261012_propulse_business_os_oauth.sql`, and verify the database backup before rollout.
2. Create a strong random client ID and secret and configure on the ProPulse backend:

```dotenv
PROPULSE_OAUTH_ENABLED=false
PROPULSE_OAUTH_CLIENT_ID=<unique-random-client-id-min-12>
PROPULSE_OAUTH_CLIENT_SECRET=<unique-random-client-secret-min-32>
PROPULSE_OAUTH_REDIRECT_URI=https://wqkjzuqiarjyoimrzalk.supabase.co/auth/v1/callback
```

3. In **Business OS** Supabase project `wqkjzuqiarjyoimrzalk`, Authentication → Providers → New Provider → **Manual configuration (OAuth2)**, configure:
   - Identifier: `custom:propulse-business`
   - Client ID and client secret: values from the ProPulse backend above.
   - Authorization URL: `https://propulsetechnologies.online/api/oauth/authorize`
   - Token URL: `https://propulsetechnologies.online/api/oauth/token`
   - UserInfo URL: `https://propulsetechnologies.online/api/oauth/userinfo`
   - PKCE: enabled; scopes: `openid email profile`.
   - Copy the **exact callback URL shown in Supabase** and use it as `PROPULSE_OAUTH_REDIRECT_URI` if different from the example above.
4. In Business OS Hostinger server-only config set `PROPULSE_OAUTH_ENABLED=true`; in ProPulse backend set `PROPULSE_OAUTH_ENABLED=true` **only after testing** both endpoints on a verified disposable account.
5. Keep Supabase Redirect URL `https://sghomesinterior.in/auth/callback` configured. Business OS `/auth/callback` will establish a Supabase session and then enforce existing company membership and role permissions.

Free-plan Supabase projects support up to three custom OAuth/OIDC providers. This does not require enterprise SAML.

## Deployment acceptance

- Unconfigured provider: fail closed; no unverified email identity can be issued.
- Unauthenticated authorization redirects to original ProPulse login without an open-redirect parameter.
- Valid login with verified email: exact callback, state returned unchanged, PKCE S256 and code issued.
- Wrong client ID/secret, callback, PKCE verifier or reused/expired code: denied.
- Revoked/deactivated ProPulse user cannot exchange a code or access UserInfo.
- Google login and successfully completed password-reset verification enable the legacy user for ProPulse OAuth. Raw signup/login password alone does **not**.
- Business OS does **not** grant new company memberships from provider email or OAuth claims.

**Production safety:** never switch these toggles on until an end-to-end test with a disposable real ProPulse user succeeds. Do not apply new migrations or set credentials by guessing values. No production database rows should be automatically backfilled as email-verified.
