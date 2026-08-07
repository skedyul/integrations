# realestate.com.au Integration

Skedyul integration for the [REA Partner Platform](https://partner.realestate.com.au/getting-started/overview/). Ingests lead enquiries in real time via webhooks, tracks Ignite-authorized agencies on a **single workplace install**, and ships a bundled CRM sync workflow.

## Features

- **Multi-agency, one install** — many REA agencies as internal `agency` records; second workplace installs are not supported
- **Ignite enablement** — `IntegrationCreated` / `Updated` / `Deleted` webhooks plus `check_ignite_integration` tool
- **Lead webhook** — `EnquiryCreated` events, Ed25519 verify, Leads API fetch, `enquiry.created` app events
- **CRM maps + workflow** — `lead` entity + `sync-rea-enquiry-from-webhook` for zero-config sync after field mapping

## Setup

### Provision (app owner)

| Variable | Description |
| -------- | ----------- |
| `REA_CLIENT_ID` | Partner Platform client ID |
| `REA_CLIENT_SECRET` | Partner Platform client secret |
| `REA_API_BASE_URL` | Optional, defaults to `https://api.realestate.com.au` |

On provision, the app prefetches REA signing keys.

### Install (workplace)

Install registers **one** install-scoped Skedyul webhook pair and **all-owners** REA subscriptions (no `ownerId`):

| REA event | Skedyul webhook |
| --------- | --------------- |
| `EnquiryCreated` | `enquiry_created` |
| `IntegrationCreated` / `Updated` / `Deleted` | `rea_integration` |

Subscription IDs are stored on the install env by the install hook (not user-entered).

### Connect agencies (setup)

1. Ask each agency to authorize this partner in Ignite:  
   https://ignite.realestate.com.au/manage/data-and-integrations  
   (requires `lead:enquiries:read`)
2. On **Setup**, click **Check Ignite status** — invokes `check_ignite_integration` directly (no dialog).  
   The tool calls the Integrations API, upserts internal agencies, and completes the `connect_agencies` step when ≥1 lead-capable agency exists.
3. Background `Integration*` webhooks keep the agency list in sync as authorizations change.

### Set up Leads (CRM)

Map the `lead` entity to workplace CRM fields and enable the bundled workflow. After mapping, enquiries upsert with no further config.

## Uninstall

Deletes the stored all-owners REA subscriptions. Skedyul removes install-scoped webhook registrations automatically.

## Migration from v1.0 (per-agency install env)

v1.x used optional `REA_AGENCY_ID` + per-agency EnquiryCreated subscriptions. This release:

1. Removes install-scoped Agency ID env
2. Creates all-owners subscriptions (and removes conflicting per-agency lead subs)
3. Discovers agencies via Integrations API / Integration webhooks

**Reinstall** (or re-run install) so subscriptions and env IDs are refreshed, then use **Check Ignite status**.

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
| `enquiry.created` | A new REA enquiry was received for a connected agency |

Workflow input type: `@app/realestate/enquiry/created`. Bundled handle: `sync-rea-enquiry-from-webhook`.

## Tools

| Tool | Description |
| ---- | ----------- |
| `check_ignite_integration` | Reconcile agencies from Integrations API; complete/invalidate setup |
| `ping` | Health check |
