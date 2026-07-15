# realestate.com.au Integration

Skedyul integration for the [REA Partner Platform](https://partner.realestate.com.au/getting-started/overview/). Ingests lead enquiries in real time via webhooks and emits typed app events for workflow-driven CRM sync.

## Features (v1)

- **Lead webhook** — receives `EnquiryCreated` events from REA, verifies Ed25519 signatures, fetches full enquiry details via the Leads API, and emits `enquiry.created` app events
- **Per-agency install** — each workplace install connects to a REA agency ID (6-letter code) validated against the Integrations API
- **OAuth** — partner-level client credentials (`REA_CLIENT_ID` / `REA_CLIENT_SECRET`)

## Setup

### Provision (app owner)

Set provision env vars on the app version:

| Variable | Description |
| -------- | ----------- |
| `REA_CLIENT_ID` | Partner Platform client ID |
| `REA_CLIENT_SECRET` | Partner Platform client secret |
| `REA_API_BASE_URL` | Optional, defaults to `https://api.realestate.com.au` |

On provision, the app prefetches REA signing keys and removes any legacy partner-wide (`all agencies`) REA subscription from v0.1.0–0.1.3 deployments.

### Install (workplace)

Each agency customer provides their **REA Agency ID** (6 uppercase letters, e.g. `ABCDEF`). The install handler:

1. Validates that REA has authorized your partner account for that agency with `lead:enquiries:read` scope
2. Registers an install-scoped Skedyul webhook URL
3. Creates a per-agency REA subscription pointing at that URL

Agencies must authorize your partner account via REA before install will succeed.

### Uninstall

The uninstall hook deletes the REA webhook subscription for that agency. Skedyul removes the install-scoped webhook registration automatically.

## Migration from v0.1.0–0.1.3

v0.1.4 switches from a single provision-level webhook + internal agency routing to install-scoped webhooks with per-agency REA subscriptions.

If you tested v0.1.0–0.1.3:

1. Deploy v0.1.4 (provision hook removes the legacy all-agencies REA subscription)
2. **Reinstall** each workplace so the install hook registers the per-agency webhook and REA subscription
3. Orphaned internal `agency` CRM records from older versions can be ignored

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
| `enquiry.created` | A new REA enquiry was received for this installation's agency |

Subscribe workflows to `app.realestate.enquiry.created` to upsert CRM lead/prospect records from the enquiry payload.
