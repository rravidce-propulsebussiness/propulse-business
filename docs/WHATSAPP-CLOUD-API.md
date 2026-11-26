# WhatsApp Cloud API for Business OS

This integration gives each authenticated Business OS user a separate WhatsApp
Business Account connection. Access tokens are encrypted at rest and are never
returned by the API.

## Required Meta permissions

- `whatsapp_business_management` — manage WABA assets, phone numbers, templates and webhooks.
- `whatsapp_business_messaging` — send messages and receive message status events.
- `business_management` — access the business portfolio and WABA.
- `public_profile` — automatically granted by Meta for login identity.

## Server configuration

Set these Hostinger environment variables:

- `META_WHATSAPP_APP_SECRET` — Meta app secret (16+ characters).
- `META_WHATSAPP_VERIFY_TOKEN` — random webhook verification string (16+ characters).
- `META_WHATSAPP_TOKEN_ENCRYPTION_KEY` — 32-byte base64 or 64-character hex key.

The existing `META_APP_SECRET` and `META_TOKEN_ENCRYPTION_KEY` are accepted as fallbacks.

## Endpoints

- `GET /api/whatsapp/accounts`
- `POST /api/whatsapp/accounts` with `businessAccountId`, `phoneNumberId`, and a Meta access token.
- `POST /api/whatsapp/accounts/:id/messages` with `to` and either `text` or a WhatsApp `template`.
- `DELETE /api/whatsapp/accounts/:id`
- Webhook: `GET/POST /api/whatsapp/webhook`

The account-connect endpoint validates both the WABA and phone number against
the Graph API before storing the encrypted token. Use a system-user token or a
token from Meta's Embedded Signup flow with the required permissions.

## Meta configuration

1. Add the WhatsApp permissions to the app's WhatsApp use case.
2. Request Advanced Access/App Review where Meta marks it required.
3. Configure the webhook callback:
   `https://YOUR_BUSINESS_OS_DOMAIN/api/whatsapp/webhook`
4. Subscribe the WhatsApp Business Account to the app.
5. Supply a token per tenant through the authenticated account-connect flow.
