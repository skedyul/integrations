# Phone Integration

SMS and voice communication via Twilio with regulatory compliance workflow.

## Features

- **SMS Messaging**: Send and receive SMS messages
- **Voice Calls**: Receive calls with forwarding support
- **Compliance Workflow**: Automated regulatory bundle submission for phone number provisioning
- **Phone Number Management**: Purchase and configure Twilio phone numbers
- **Contact Association**: Link phone numbers to contact models

## Architecture

```
src/
├── lib/
│   └── twilio_client.ts              # Twilio API client
├── tools/
│   ├── send_sms.ts                   # Send SMS messages
│   ├── submit_new_phone_number.ts    # Purchase phone number
│   ├── submit_compliance_document.ts # Submit compliance bundle
│   ├── check_compliance_status.ts    # Check bundle status
│   ├── update_phone_details.ts       # Update phone name
│   ├── update_forwarding_number.ts   # Configure call forwarding
│   ├── create_contact_association_link.ts  # Link contacts
│   └── remove_phone_number.ts        # Remove phone number
├── webhooks/
│   ├── receive_sms.ts                # Incoming SMS webhook
│   ├── receive_call.ts               # Incoming call webhook
│   ├── compliance_status.ts          # Compliance status callback
│   └── lib/
│       └── helpers.ts                # Webhook utilities
├── server/
│   ├── mcp_server.ts                 # MCP server entry point
│   └── hooks/
│       ├── install.ts                # Install handler
│       └── uninstall.ts              # Cleanup handler
└── registries.ts                     # Tool + webhook exports
```

## Compliance Workflow

Phone number provisioning requires regulatory compliance approval:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Submit Docs    │────▶│  Twilio Review  │────▶│   Approved      │
│  (PENDING)      │     │  (SUBMITTED)    │     │   (APPROVED)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   Rejected      │
                        │   (REJECTED)    │
                        └─────────────────┘
```

1. **Submit Documents**: User provides business details and registration documents
2. **Bundle Creation**: App creates Twilio regulatory bundle with end-user and supporting documents
3. **Review**: Twilio reviews the submission (typically 1-3 business days)
4. **Webhook Callback**: `compliance_status` webhook receives status updates
5. **Approval**: Once approved, phone numbers can be purchased

## Tools

| Tool | Description |
|------|-------------|
| `send_sms` | Send an SMS message to a subscriber |
| `submit_compliance_document` | Submit business documents for regulatory compliance |
| `check_compliance_status` | Check the status of a compliance submission |
| `submit_new_phone_number` | Purchase a new Twilio phone number |
| `update_phone_details` | Update phone number name |
| `update_forwarding_number` | Configure call forwarding destination |
| `create_contact_association_link` | Link phone channel to contact model |
| `remove_phone_number` | Remove a phone number from the installation |

## Webhooks

| Webhook | Description |
|---------|-------------|
| `receive_sms` | Receives incoming SMS messages from Twilio |
| `receive_call` | Handles incoming voice calls with forwarding |
| `compliance_status` | Receives compliance bundle status updates |

### Webhook Lifecycle Hooks

The `receive_sms` webhook includes lifecycle hooks for automatic Twilio configuration:

- **onCommunicationChannelCreated**: Configures Twilio phone number's SMS webhook URL
- **onCommunicationChannelUpdated**: Updates webhook URL if needed
- **onCommunicationChannelDeleted**: Cleans up webhook configuration

## Models

### compliance_record (INTERNAL)

Regulatory compliance records required before phone number provisioning.

| Field | Type | Owner | Description |
|-------|------|-------|-------------|
| `business_name` | STRING | WORKPLACE | Legal business name |
| `business_email` | STRING | WORKPLACE | Email for notifications |
| `business_id` | STRING | WORKPLACE | Tax ID / ABN |
| `country` | STRING | WORKPLACE | Country code (AU) |
| `address` | STRING | WORKPLACE | Full business address |
| `file` | FILE | WORKPLACE | Registration document |
| `status` | STRING | APP | PENDING, SUBMITTED, PENDING_REVIEW, APPROVED, REJECTED |
| `bundle_sid` | STRING | APP | Twilio Regulatory Bundle SID |
| `end_user_sid` | STRING | APP | Twilio End-User SID |
| `document_sid` | STRING | APP | Twilio Supporting Document SID |
| `address_sid` | STRING | APP | Twilio Address SID |
| `rejection_reason` | STRING | APP | Reason if rejected |

### phone_number (INTERNAL)

Provisioned Twilio phone numbers.

| Field | Type | Owner | Description |
|-------|------|-------|-------------|
| `phone` | STRING | APP | Phone number (E.164 format) |
| `name` | STRING | WORKPLACE | User-provided friendly name |
| `forwarding_phone_number` | STRING | WORKPLACE | Call forwarding destination |

**Requires**: `compliance_record` with `status = 'APPROVED'`

## Channels

### phone

Communication channel for SMS and voice.

| Capability | Send Tool | Receive Webhook |
|------------|-----------|-----------------|
| SMS | `send_sms` | `receive_sms` |
| Voice | `make_call` | `receive_call` |

## Environment Variables

### Provision-Level (Developer)

| Variable | Required | Description |
|----------|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Yes | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Yes | Twilio Auth Token |
| `TWILIO_CALL_FORWARD_USERNAME` | No | Username for call forwarding auth |
| `TWILIO_CALL_FORWARD_PASSWORD` | No | Password for call forwarding auth |
| `GOOGLE_MAPS_API_KEY` | Yes | Google Maps API key for address geocoding |

### Install-Level (User)

No user-provided credentials required. Compliance documents are submitted through the UI.

## Pages

| Page | Path | Description |
|------|------|-------------|
| Compliance | `/compliance` | Submit compliance documents (default landing) |
| Phone Numbers | `/phone-numbers` | List and purchase phone numbers |
| Number Overview | `/phone-numbers/[id]/overview` | View phone number details |
| Messaging | `/phone-numbers/[id]/messaging` | SMS settings |
| Voice | `/phone-numbers/[id]/voice` | Call forwarding settings |

## Workflows

### send-templated-message

Send templated SMS messages to multiple contacts.

```yaml
# workflows/send-templated-message.yml
actions:
  - label: Send templated message
    handle: send-templated-sms-message
    batch: true
    entityHandle: contact
    inputs:
      - key: identifier-value
        fieldRef: { fieldHandle: phone, entityHandle: contact }
      - key: communication-channel-id
        template: '{{ input }}'
      - key: message
        template: '{{ input }}'
```

## Setup

### 1. Create Twilio Account

1. Sign up at [Twilio](https://www.twilio.com/)
2. Get your Account SID and Auth Token from the Console
3. Enable Regulatory Bundles for your region

### 2. Configure Google Maps API

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Geocoding API
3. Create an API key with Geocoding API access

### 3. Compliance Requirements

For Australian phone numbers:
- Business registration document (ASIC extract, ABN certificate)
- Valid business address
- Business email for notifications

## Development

```bash
# Navigate to integration
cd integrations/phone

# Link to test workplace
skedyul dev link --workplace my-test-clinic

# Start development server
skedyul dev serve --workplace my-test-clinic
```

### Testing Webhooks

Twilio webhooks require a public URL. The CLI automatically creates an ngrok tunnel, or use:

```bash
skedyul dev serve --workplace my-test-clinic --tunnel-url https://your-tunnel.ngrok.io
```

### Testing Compliance Flow

1. Submit compliance documents via the UI
2. Check Twilio Console for bundle status
3. Use `check_compliance_status` tool to verify
4. Once approved, purchase a phone number

## Troubleshooting

### "Compliance must be approved"

Phone numbers require an approved compliance record. Submit documents and wait for Twilio approval.

### SMS not being received

1. Verify the webhook URL is configured in Twilio
2. Check that the phone number's SMS URL points to the correct webhook
3. Verify signature validation is passing

### Call forwarding not working

1. Ensure `forwarding_phone_number` is set in E.164 format
2. Check that the voice webhook URL is configured
3. Verify `TWILIO_CALL_FORWARD_USERNAME/PASSWORD` if using authentication
