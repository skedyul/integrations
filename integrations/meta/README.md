# Meta Integration

Connect WhatsApp, Facebook Messenger, and Instagram Direct to Skedyul via the Meta Graph API.

## Features

- **OAuth Authentication**: Secure connection to Meta Business accounts
- **WhatsApp Messaging**: Send and receive 1:1 and group messages
- **Messenger**: Send and receive Facebook Page messages
- **Instagram Direct**: Send and receive Instagram Business DMs
- **Unified Webhook**: One webhook URL handles all three Meta products

## Architecture

```
src/
├── lib/
│   ├── meta_client.ts              # Graph API client
│   └── meta_webhook/               # Signature verify + channel resolution
├── tools/
│   ├── send_whatsapp.ts
│   ├── send_messenger.ts
│   ├── send_instagram.ts
│   ├── add_whatsapp_number.ts
│   ├── add_facebook_page.ts
│   └── add_instagram_account.ts
├── webhooks/
│   ├── receive_meta.ts             # Unified webhook entry
│   └── handlers/                   # whatsapp, messenger, instagram
├── provision/
│   ├── channels/                   # whatsapp, messenger, instagram
│   └── pages/                      # Account, numbers, pages, IG accounts
└── server/hooks/                   # OAuth install + callback
```

## Channels

| Handle | Business identifier | Thread routing (1:1) | Group routing |
|--------|---------------------|----------------------|---------------|
| `whatsapp` | E.164 business phone | Sender phone (`routingAddress`) | `externalId` = WhatsApp `group_id` |
| `messenger` | Facebook `page_id` | Sender PSID | N/A |
| `instagram` | `instagram_account_id` | Sender IGSID | N/A |

Inbound webhooks resolve the installation via token exchange (lookup CRM record by Meta resource ID, then find the matching `communicationChannel`).

## Tools

| Tool | Description |
|------|-------------|
| `send_whatsapp` | Send WhatsApp message (1:1 or group via `group.externalGroupId`) |
| `send_messenger` | Send Messenger message to a PSID |
| `send_instagram` | Send Instagram Direct message |
| `add_whatsapp_number` | Provision WhatsApp channel from WABA number |
| `add_facebook_page` | Provision Messenger channel from connected page |
| `add_instagram_account` | Provision Instagram channel from connected account |
| `fetch_registered_wa_business_numbers` | List WABA numbers from Meta |

## Webhooks

| Webhook | Description |
|---------|-------------|
| `receive_meta` | Unified webhook for WhatsApp, Messenger, and Instagram |
| `receive_whatsapp` | Alias for `receive_meta` (backward compatible) |

Meta sends different `object` values on the same callback URL:

- `whatsapp_business_account` → WhatsApp messages and status updates
- `page` → Messenger messaging events
- `instagram` → Instagram Direct messaging events

## Setup

### 1. Create a Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a Business app with WhatsApp, Messenger, and Instagram products
3. Configure OAuth redirect: `{SKEDYUL_API_URL}/api/callbacks/oauth/meta/{version}`

### 2. Configure Webhooks (single URL)

Set webhook URL: `{SKEDYUL_API_URL}/api/webhooks/{registration_id}`

Subscribe in Meta App Dashboard:

- **WhatsApp**: `messages`, `message_deliveries`, `message_reads`
- **Page (Messenger)**: `messages`, `messaging_postbacks`, `message_reads`
- **Instagram**: `messages`

Verify token must match `META_WEBHOOK_VERIFY_TOKEN`.

### 3. OAuth scopes

- `whatsapp_business_messaging`, `whatsapp_business_management`
- `business_management`
- `pages_messaging`, `pages_manage_metadata`
- `instagram_basic`, `instagram_manage_messages`

### 4. Add channels

After OAuth, add each channel from the app UI:

- **WhatsApp Numbers** → select WABA number
- **Facebook Pages** → select page for Messenger
- **Instagram Accounts** → select IG Business account

## Token refresh

OAuth yields a long-lived user token (~60 days). Re-run the Meta OAuth connect flow before expiry. The integration surfaces `AppAuthInvalidError` when Meta rejects an expired token.

## Environment Variables

| Variable | Level | Description |
|----------|-------|-------------|
| `META_APP_ID` | Provision | Facebook App ID |
| `META_APP_SECRET` | Provision | Facebook App Secret |
| `META_WEBHOOK_VERIFY_TOKEN` | Provision | Webhook verification token |
| `GRAPH_API_VERSION` | Provision | e.g. `v24.0` |
| `META_ACCESS_TOKEN` | Install | Long-lived token (set by OAuth) |

## Development

```bash
cd integrations/meta
skedyul dev link --workplace my-test-clinic
skedyul dev serve --workplace my-test-clinic
```

OAuth requires a public callback URL (`--tunnel-url` or ngrok).
