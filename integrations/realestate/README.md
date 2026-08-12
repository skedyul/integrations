# realestate.com.au Integration

Skedyul integration for the [REA Partner Platform](https://partner.realestate.com.au/getting-started/overview/). Ingests lead enquiries in real time via webhooks, tracks Ignite-authorized agencies on a **single workplace install**, and ships a bundled CRM sync workflow.

## Features

- **Multi-agency, one install** — many REA agencies as internal `agency` records; second workplace installs are not supported
- **Ignite enablement** — `IntegrationCreated` / `Updated` / `Deleted` webhooks plus `check_ignite_integration` tool
- **Lead webhook** — `EnquiryCreated` events, Ed25519 verify, Leads API fetch, `enquiry.created` app events
- **CRM maps + workflow** — `lead` + `enquiry` entities and `sync-rea-enquiry-from-webhook` (Default Realestate Enquiry Event) for zero-config sync after field mapping

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

Map the **Lead** (person) and **Enquiry** entities to workplace CRM fields and enable the bundled workflow.

On each `enquiry.created` event, **Default Realestate Enquiry Event** (`sync-rea-enquiry-from-webhook`):

1. **Create-or-find Lead** — upsert person fields matched on email/phone (when a Lead map is configured and identity is present)
2. **Always create/upsert Enquiry** — matched on `rea_enquiry_id`, with a relationship link to the Lead instance
3. **Conversation contact + signal** — resolve/create contact on the Lead and post an enquiry signal

Listing details (`listing_id`, `listing_address`) stay denormalized on Enquiry (no separate Property entity).

#### Breaking change (v1.1 → v1.2)

Earlier releases mapped a single flat `lead` entity that included `rea_enquiry_id` and enquiry-specific fields. Those fields moved to the **Enquiry** entity. Existing installs must re-map:

- **Lead** — person fields only (`first_name`, `last_name`, `email`, `phone`, …)
- **Enquiry** — `rea_enquiry_id`, listing/comments/source, and the `lead` relationship

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

Workflow input type: `@app/realestate/enquiry/created`. Bundled handle: `sync-rea-enquiry-from-webhook` (**Default Realestate Enquiry Event**).

## Tools

| Tool | Description |
| ---- | ----------- |
| `check_ignite_integration` | Reconcile agencies from Integrations API; complete/invalidate setup |
| `ping` | Health check |
