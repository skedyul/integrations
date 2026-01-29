# Email Integration App

Send and receive emails with your `{subdomain}@skedyul.app` address.

## Features

- **Auto-provisioned address**: On install, creates `{subdomain}@skedyul.app` email address
- **Send emails**: Via the `send_email` tool with HTML/plain text and attachments
- **Receive emails**: Webhook handler for inbound emails with attachment processing
- **Provider-agnostic**: Designed with a provider interface for easy swapping (currently Mailgun)

## Architecture

```
src/
├── lib/
│   ├── email-provider.ts     # Provider interface + factory
│   ├── providers/
│   │   └── mailgun.ts        # Mailgun implementation
│   └── attachments.ts        # Attachment download/upload
├── tools/
│   ├── send-email.ts         # Send email tool
│   └── update-email-address.ts
├── webhooks/
│   └── receive-email.ts      # Inbound email webhook
├── install.ts                # Install handler (auto-provisions default address)
├── registries.ts             # Tool + webhook exports
└── server/
    └── mcp-server.ts         # MCP server entry point
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `EMAIL_PROVIDER` | Email provider (default: `mailgun`) | No |
| `MAILGUN_API_KEY` | Mailgun API key | Yes |
| `MAILGUN_DOMAIN` | Mailgun domain (default: `skedyul.app`) | Yes |
| `MAILGUN_SIGNING_SECRET` | Webhook signing secret | Yes |
| `MAILGUN_API_URL` | Mailgun API endpoint | No |

## Models

- **email_domain**: Domain configuration (system vs custom)
- **email_address**: Individual email addresses linked to domains

## Channel

- **email**: Communication channel with `send_email` and `receive_email` capabilities

## Future Plans

- Custom domain support with DNS verification
- Support for additional providers (Resend, SendGrid, SES)
- Email templates
