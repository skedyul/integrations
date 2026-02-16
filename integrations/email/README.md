# Email Integration

Send and receive emails with auto-provisioned `{subdomain}@skedyul.app` addresses.

## Features

- **Auto-Provisioned Addresses**: Creates `{subdomain}@skedyul.app` email on install
- **Send Emails**: HTML/plain text with attachments via `send_email` tool
- **Receive Emails**: Webhook handler for inbound emails with attachment processing
- **Provider-Agnostic**: Designed with provider interface for easy swapping (currently Mailgun)

## Architecture

```
src/
├── lib/
│   ├── email_provider.ts       # Provider interface + factory
│   ├── providers/
│   │   └── mailgun.ts          # Mailgun implementation
│   └── attachments.ts          # Attachment download/upload
├── tools/
│   ├── send_email.ts           # Send email tool
│   └── update_email_address.ts # Update email settings
├── webhooks/
│   └── receive_email.ts        # Inbound email webhook
├── server/
│   ├── mcp_server.ts           # MCP server entry point
│   └── hooks/
│       ├── install.ts          # Install handler (auto-provisions address)
│       └── provision.ts        # Provision handler
└── registries.ts               # Tool + webhook exports
```

## Tools

| Tool | Description |
|------|-------------|
| `send_email` | Send an email with HTML/plain text and optional attachments |
| `update_email_address` | Update email address settings |

## Webhooks

| Webhook | Description |
|---------|-------------|
| `receive_email` | Receives inbound emails from Mailgun |

### Webhook Features

- **Signature Verification**: Validates Mailgun webhook signatures
- **Attachment Processing**: Downloads and uploads attachments to Skedyul
- **Contact Association**: Links emails to contacts via email address

## Models

### email_domain (INTERNAL)

Domain configuration for sending and receiving emails.

| Field | Type | Owner | Description |
|-------|------|-------|-------------|
| `domain` | STRING | APP | Email domain (e.g., skedyul.app) |
| `type` | STRING | APP | SYSTEM or CUSTOM |
| `status` | STRING | APP | ACTIVE, PENDING, FAILED |
| `verification_status` | STRING | APP | DNS verification status |

### email_address (INTERNAL)

Individual email addresses linked to domains.

| Field | Type | Owner | Description |
|-------|------|-------|-------------|
| `address` | STRING | APP | Full email address |
| `local_part` | STRING | APP | Part before @ |
| `name` | STRING | WORKPLACE | Display name |
| `is_default` | BOOLEAN | APP | Default address flag |

**Relationship**: Many email addresses to one domain

## Channels

### email

Communication channel for email messaging.

| Capability | Send Tool | Receive Webhook |
|------------|-----------|-----------------|
| Messaging | `send_email` | `receive_email` |

## Environment Variables

### Provision-Level (Developer)

| Variable | Required | Description |
|----------|----------|-------------|
| `EMAIL_PROVIDER` | No | Email provider (default: `mailgun`) |
| `MAILGUN_API_KEY` | Yes | Mailgun API key |
| `MAILGUN_DOMAIN` | Yes | Mailgun sending domain |
| `MAILGUN_SIGNING_SECRET` | Yes | Webhook signing secret |

### Install-Level (User)

No user-provided credentials required. Email addresses are auto-provisioned.

## Pages

| Page | Path | Description |
|------|------|-------------|
| Email Addresses | `/email-addresses` | List and manage email addresses |
| Address Detail | `/email-addresses/[id]` | View individual address settings |

## Install Flow

1. User installs the app
2. Install handler creates default email address: `{subdomain}@skedyul.app`
3. Email domain and address records are created
4. Mailgun routes are configured for inbound emails

```ts
// src/server/hooks/install.ts
export default async function install(ctx: InstallHandlerContext) {
  const { workplace } = ctx
  
  // Create default email address
  const localPart = workplace.subdomain
  const domain = 'skedyul.app'
  const address = `${localPart}@${domain}`
  
  // Create email_domain instance (if not exists)
  await instance.create('email_domain', {
    domain,
    type: 'SYSTEM',
    status: 'ACTIVE',
  })
  
  // Create email_address instance
  await instance.create('email_address', {
    address,
    local_part: localPart,
    is_default: true,
  })
  
  // Configure Mailgun route for inbound emails
  await configureMailgunRoute(address, webhookUrl)
  
  return {}
}
```

## Email Sending

```ts
// Send a simple email
await send_email({
  to: 'recipient@example.com',
  subject: 'Hello',
  body: 'This is a test email.',
})

// Send with HTML and attachments
await send_email({
  to: 'recipient@example.com',
  subject: 'Report',
  body: '<h1>Monthly Report</h1><p>See attached.</p>',
  html: true,
  attachments: [
    { fileId: 'fl_abc123', name: 'report.pdf' },
  ],
})
```

## Development

```bash
# Navigate to integration
cd integrations/email

# Link to test workplace
skedyul dev link --workplace my-test-clinic

# Start development server
skedyul dev serve --workplace my-test-clinic
```

### Testing Webhooks

Mailgun webhooks require a public URL. The CLI automatically creates an ngrok tunnel:

```bash
skedyul dev serve --workplace my-test-clinic
# Webhook URL: https://abc123.ngrok.io/webhooks/receive_email
```

Configure this URL in Mailgun's routing settings.

## Troubleshooting

### Emails not being received

1. Verify the Mailgun route is configured correctly
2. Check that the webhook URL is accessible
3. Verify signature validation is passing (check `MAILGUN_SIGNING_SECRET`)

### Attachments not processing

1. Check file size limits (Mailgun has a 25MB limit)
2. Verify the attachment download URL is accessible
3. Check Skedyul file upload permissions

### Send failures

1. Verify `MAILGUN_API_KEY` is correct
2. Check that the sending domain is verified in Mailgun
3. Verify the recipient email is valid

## Future Plans

- Custom domain support with DNS verification
- Additional providers (Resend, SendGrid, SES)
- Email templates
- Scheduled sending
