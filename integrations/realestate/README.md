# realestate.com.au Integration

Skedyul integration for the [REA Partner Platform](https://partner.realestate.com.au/getting-started/overview/). Ingests lead enquiries in real time via webhooks and emits typed app events for workflow-driven CRM sync.

## Features (v1)

- **Lead webhook** — receives `EnquiryCreated` events from REA, verifies Ed25519 signatures, fetches full enquiry details via the Leads API, and emits `enquiry.created` app events
- **Agency linking** — each workplace install connects to a REA agency ID (6-letter code) validated against the Integrations API
- **OAuth** — partner-level client credentials (`REA_CLIENT_ID` / `REA_CLIENT_SECRET`)

## Setup

### Provision (app owner)

Set provision env vars on the app version:

| Variable | Description |
| -------- | ----------- |
| `REA_CLIENT_ID` | Partner Platform client ID |
| `REA_CLIENT_SECRET` | Partner Platform client secret |
| `REA_API_BASE_URL` | Optional, defaults to `https://api.realestate.com.au` |

On provision, the app registers a Skedyul webhook URL and creates an REA subscription for `EnquiryCreated` / `lead` events.

### Install (workplace)

Each agency customer provides their **REA Agency ID** (6 uppercase letters, e.g. `ABCDEF`). The install handler validates that REA has authorized your partner account for that agency with `lead:enquiries:read` scope.

Agencies must authorize your partner account via REA before install will succeed.

## Development

```bash
cd integrations/realestate
pnpm install
pnpm test
pnpm build
```

## Events

| Event | Description |
| ----- | ----------- |
| `enquiry.created` | A new REA enquiry was received for a linked agency |

Subscribe workflows to `app.realestate.enquiry.created` to upsert CRM lead/prospect records. See `workflows/examples/sync-enquiry-from-webhook.yml`.
