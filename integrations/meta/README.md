# Meta Integration

Connect WhatsApp, Instagram, and Messenger to Skedyul via the Meta Graph API.

## Features

- **OAuth Authentication**: Secure connection to Meta Business accounts
- **WhatsApp Messaging**: Send and receive WhatsApp messages
- **Multi-Channel Support**: WhatsApp, Instagram DMs, and Messenger (coming soon)
- **Phone Number Management**: Add and manage WhatsApp Business numbers

## Architecture

```
src/
├── lib/
│   └── meta_client.ts           # Meta Graph API client
├── tools/
│   ├── send_whatsapp.ts         # Send WhatsApp messages
│   ├── fetch_registered_wa_business_numbers.ts  # List WABA numbers
│   └── add_whatsapp_number.ts   # Add number to installation
├── webhooks/
│   └── receive_whatsapp.ts      # Incoming message webhook
├── server/
│   ├── mcp_server.ts            # MCP server entry point
│   └── hooks/
│       ├── install.ts           # OAuth redirect
│       └── oauth_callback.ts    # Token exchange
└── registries.ts                # Tool + webhook exports
```

## Authentication Flow

This integration uses OAuth to connect to Meta:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Skedyul   │────▶│    Meta     │────▶│   Skedyul   │
│   Install   │     │   OAuth     │     │  Callback   │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      │ 1. Redirect       │ 2. User           │ 3. Exchange
      │    to Meta        │    authorizes     │    code for
      │                   │                   │    token
```

1. **Install Handler**: Redirects user to Meta OAuth with required scopes
2. **User Authorization**: User grants permissions in Meta
3. **OAuth Callback**: Exchanges code for long-lived access token, creates `meta_connection` instance

## Tools

| Tool | Description |
|------|-------------|
| `send_whatsapp` | Send a WhatsApp message to a subscriber |
| `fetch_registered_wa_business_numbers` | List phone numbers from the connected WABA |
| `add_whatsapp_number` | Add a WhatsApp number to the installation |

## Webhooks

| Webhook | Description |
|---------|-------------|
| `receive_whatsapp` | Receives incoming WhatsApp messages from Meta |

### Webhook Verification

The `receive_whatsapp` webhook handles both:
- **GET requests**: Meta webhook verification (hub.mode, hub.verify_token, hub.challenge)
- **POST requests**: Incoming messages with signature verification

## Models

### meta_connection (INTERNAL)

Top-level OAuth connection to Meta. One per installation.

| Field | Type | Description |
|-------|------|-------------|
| `waba_id` | STRING | WhatsApp Business Account ID |
| `business_name` | STRING | Business name from Meta |
| `status` | STRING | Connection status (PENDING, CONNECTED, ERROR) |

### whatsapp_phone_number (INTERNAL)

WhatsApp phone numbers from the connected WABA.

| Field | Type | Owner | Description |
|-------|------|-------|-------------|
| `phone` | STRING | APP | Phone number (E.164 format) |
| `phone_number_id` | STRING | APP | Meta Graph API phone number ID |
| `display_name` | STRING | APP | Display name from Meta |
| `quality_rating` | STRING | APP | Meta quality rating |
| `name` | STRING | WORKPLACE | User-provided friendly name |

### facebook_page (INTERNAL)

Connected Facebook Pages for Messenger.

| Field | Type | Description |
|-------|------|-------------|
| `page_id` | STRING | Meta Graph API Page ID |
| `name` | STRING | Page name |
| `access_token` | STRING | Page-specific access token |
| `category` | STRING | Page category |

### instagram_account (INTERNAL)

Connected Instagram Business accounts.

| Field | Type | Description |
|-------|------|-------------|
| `instagram_account_id` | STRING | Meta Graph API Instagram Account ID |
| `username` | STRING | Instagram username |
| `name` | STRING | Display name |
| `profile_picture_url` | STRING | Profile picture URL |

## Channels

### whatsapp

Communication channel for WhatsApp messaging.

| Capability | Tool |
|------------|------|
| Send | `send_whatsapp` |
| Receive | `receive_whatsapp` |

## Environment Variables

### Provision-Level (Developer)

| Variable | Required | Description |
|----------|----------|-------------|
| `META_APP_ID` | Yes | Facebook App ID from Meta App Dashboard |
| `META_APP_SECRET` | Yes | Facebook App Secret |
| `META_WEBHOOK_VERIFY_TOKEN` | Yes | Secret token for webhook verification |
| `GRAPH_API_VERSION` | Yes | Graph API version (e.g., `v21.0`) |

### Install-Level (User)

No user-provided credentials required. OAuth flow handles authentication.

## Pages

| Page | Path | Description |
|------|------|-------------|
| Account | `/account` | View Meta connection status |
| WhatsApp Numbers | `/whatsapp-numbers` | List and add WhatsApp numbers |
| Number Detail | `/whatsapp-numbers/[id]/overview` | View individual number details |

## Setup

### 1. Create a Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new app with "Business" type
3. Add WhatsApp product to your app
4. Configure OAuth redirect URI: `{SKEDYUL_API_URL}/api/callbacks/oauth/meta/{version}`

### 2. Configure Webhooks

1. In Meta App Dashboard, go to WhatsApp > Configuration
2. Set webhook URL: `{SKEDYUL_API_URL}/api/webhooks/{registration_id}`
3. Set verify token to match `META_WEBHOOK_VERIFY_TOKEN`
4. Subscribe to: `messages`, `message_deliveries`, `message_reads`

### 3. Required Permissions

The OAuth flow requests these scopes:
- `whatsapp_business_messaging`
- `whatsapp_business_management`
- `business_management`
- `pages_messaging` (for Messenger)
- `instagram_basic` (for Instagram)
- `instagram_manage_messages` (for Instagram DMs)

## Development

```bash
# Navigate to integration
cd integrations/meta

# Link to test workplace
skedyul dev link --workplace my-test-clinic

# Start development server
skedyul dev serve --workplace my-test-clinic
```

Note: OAuth flow requires a publicly accessible callback URL. Use `--tunnel-url` or let the CLI create an ngrok tunnel.
