# Google Integration

Google Calendar integration for Skedyul with OAuth, batch import, optional live push, typed app events, CRM maps, and calendar CRUD tools.

Future Google services (Gmail, Drive) are stubbed under `src/services/` but not implemented in v1.

## Features

- OAuth 2.0 install flow with offline refresh tokens. Connect does not import history, emit events, or start watches
- Reconnect from **Account** or the Setup checklist
- Full Google Calendar support: list calendars, list/get/create/update/delete events, free/busy queries
- History and incremental pull go through one `import_calendars` / `import_calendar_events` batch job (sync-token aware, stored on the mapped calendar). Never emit one app event per listed row
- Optional live Google push: one ping starts one batch job after the user enables watches
- Typed app events for later single changes (`app.google.calendar.created/updated/deleted`)
- Install-time CRM maps for `calendar` and `calendar_event`, including an event → calendar relationship
- Bundled workflows with event wiring UI (not a backfill path)
- Admin pages for setup, account, calendars, linked sync state, and event CRM mapping

## Setup

### 1. Google Cloud Console

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Google Calendar API**
3. Configure the OAuth consent screen
4. Create an OAuth 2.0 **Web application** client
5. Add an authorized redirect URI:

```
{SKEDYUL_API_URL}/api/callbacks/oauth/google/{appVersionHandle}
```

### 2. Skedyul app version env

Configure these provision-level variables on the app version:

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_CLIENT_ID` | Yes | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | OAuth client secret |
| `GOOGLE_OAUTH_REDIRECT_URI` | No | Override redirect URI if needed |

Install-level variables (`GOOGLE_REFRESH_TOKEN`, `GOOGLE_ACCESS_TOKEN`, etc.) are set automatically by the OAuth callback.

### 3. Install the app (workplace)

1. Install the Google app on a workplace
2. Open **Setup** and complete **Connect Google account** (OAuth). Use **Reconnect Google** if tokens are missing. Connect only stores tokens and quietly seeds linked calendars.
3. Complete **Set up calendars**:
   - Map the `calendar` entity to your workplace calendar model (`google_calendar_id` match key)
   - Run **Import Calendars** on the Calendars page (one batch job)
   - Optionally wire `app.google.calendar.created/updated/deleted` for later single changes — not for history
4. Complete **Set up calendar events**:
   - Map the `calendar_event` entity to your workplace event model
   - Set composite match fields: `google_event_id` + `calendar_id`
   - Map the `calendar` relationship so Calendar LIST view can section by calendar
   - Run **Import Calendar Events** on the Events page (one batch job)
   - Optionally wire `app.google.calendar.event.*` for a later 1:1 payload — not for pull sync
5. On the workplace Event list, set Calendar view **section** to the calendar relationship so events from every synced calendar appear together
6. Optional live updates: call `calendar_sync` with `enable_live_sync: true` (or add a calendar with sync enabled) so Google push starts **one** import batch per ping

Connect never imports history, never starts `calendar_push`, and never emits per-event webhooks.

## App events

| Event | Workflow type |
|-------|---------------|
| `calendar.created` | `app.google.calendar.created` |
| `calendar.updated` | `app.google.calendar.updated` |
| `calendar.deleted` | `app.google.calendar.deleted` |
| `calendar.event.created` | `app.google.calendar.event.created` |
| `calendar.event.updated` | `app.google.calendar.event.updated` |
| `calendar.event.deleted` | `app.google.calendar.event.deleted` |
| `calendar.sync.completed` | `app.google.calendar.sync.completed` |
| `calendar.sync.failed` | `app.google.calendar.sync.failed` |

`sync-google-calendar-from-webhook` upserts CRM calendars via `| google: "format", "calendar"`.

`sync-google-calendar-event-from-webhook` upserts the parent calendar first, then the event (with the calendar relationship) via `| google: "format", "calendar_event"`.

## Tools

### Connection / setup

- `fetch_google_connection`
- `reconnect_google`
- `calendars_list`
- `add_google_calendar`
- `remove_google_calendar`

### Read

- `calendar_events_list`
- `calendar_event_get`
- `calendar_freebusy_query`

### Write

- `calendar_event_create`
- `calendar_event_update`
- `calendar_event_delete`

### Sync

- `calendar_sync` (starts one `import_calendar_events` batch; optional `enable_live_sync` registers watches)

### Batch operations

- `import_calendars`
- `import_calendar_events`

## Development

```bash
cd integrations/google
pnpm install
pnpm test
pnpm build
```

## Architecture notes

- One Google account per installation (Meta-style)
- Connect does not register `calendar_push` or start watches. Live push is opt-in and starts one batch job per Google ping
- Multi-record pulls (Import, `calendar_sync`, push) must start **0 or 1** platform batch jobs. Never `for (event of events) emit()`
- Per-install calendar identity and sync/watch state live on the workplace `calendar` CRM map. Internal models are only for data shared across installs, so Google does not declare a `google_calendar` internal model
- CRM-facing `calendar` and `calendar_event` entities are mapped per install; events relate to calendars so workplace Calendar LIST view can load events from multiple calendars in one query
- Live `calendar.event.*` workflows stay for a later 1:1 payload, not for pull/history
- CRM → Google two-way sync is not automatic; write tools exist for agents/manual calls
- Gmail and Drive modules exist as stubs only (`src/services/gmail`, `src/services/drive`)
