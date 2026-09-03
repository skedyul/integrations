# Google Integration

Google Calendar integration for Skedyul with OAuth, batch import, optional live push, typed app events, CRM maps, and calendar CRUD tools.

Future Google services (Gmail, Drive) are stubbed under `src/services/` but not implemented in v1.

## Features

- OAuth 2.0 install flow with offline refresh tokens. Connect stores tokens only — it does not seed calendars, import history, emit events, or start watches
- Reconnect from **Account** or the Setup checklist
- Full Google Calendar support: list calendars, list/get/create/update/delete events, free/busy queries
- History backfill is one `import_calendars` job (calendars, then events/people/attendees when those maps are ready). Incremental pull and live Google push use `import_calendar_events` (sync-token aware, stored on the mapped calendar). Never emit one app event per listed row
- Optional live Google push: one ping starts one batch job after the user enables watches
- Typed app events for later single changes (`app.google.calendar.created/updated/deleted`)
- Install-time CRM maps for `calendar`, `calendar_event`, `user`, and `attendee`. Map `user` onto a workplace people model (customer/client/contact). Attendees are event×email RSVP rows related to the event and user.
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
2. Open **Setup** and complete **Connect Google account** (OAuth). Use **Reconnect Google** if tokens are missing. Connect only stores tokens. Uninstall deletes Google-keyed calendar, event, and attendee CRM rows so a later Import does not create a second set.
3. Complete **Set up calendars**:
   - Map the `calendar` entity to your workplace calendar model (`google_calendar_id` match key)
   - Run **Import calendars** on the Google Calendar hub (one batch job). That job also imports events, people, and attendees when those maps are ready
   - Optionally wire `app.google.calendar.created/updated/deleted` for later single changes — not for history
4. Complete **Set up calendar events**:
   - Map the `calendar_event` entity to your workplace event model
   - Set composite match fields: `google_event_id` + `calendar_id` (match keys only — not required on Skedyul create)
   - Map the `calendar` relationship so Calendar LIST view can section by calendar
   - Keep the event `attendees` Google JSON on a field such as `attendee_emails` (do not map that object onto a people relation). RSVP rows live on the `attendee` model.
   - Optionally wire `app.google.calendar.event.*` for a later 1:1 payload — not for pull sync
5. Complete **Set up calendar people**:
   - Map `user` onto customer/client/contact (match `email`)
   - Map `attendee` onto an RSVP/guest model (match `event_attendee_key`)
   - Map attendee `event` → event and `user` → the workplace people field
   - Import calendars also upserts users then attendees (`event: { __crmMatch }` / `user: { __crmMatch }`)
6. On the workplace Event list, set Calendar view **section** to the calendar relationship so events from every synced calendar appear together
7. Optional live updates: call `calendar_sync` with `enable_live_sync: true` (or add a calendar with sync enabled) so Google push starts **one** import batch per ping

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

`push-calendar-event-create-to-google` listens for CRM record creates (`@crm/*/created`). Create payloads are sparse (title/times only), so the workflow reloads the row, resolves the Google calendar from the assigned relation (`instance.find` when the value is a Skedyul id), creates via `calendar_event_create` with `emit_event: false`, and writes `google_event_id` back with `instance.update`. Emitting `calendar.event.created` here would inbound-upsert a duplicate CRM row.

`push-calendar-event-update-to-google` listens for CRM record changes (`@crm/*/updated`; setup binds the mapped workplace model). It unformats the record with `| google: "unformat", inputs.data.model` and patches Google via `calendar_event_update` (title, description, location, times, attendees, recurrence, status). Timed patches send a naive local `dateTime` plus `timeZone` (never a `Z`/offset timestamp together with `timeZone`). Series exceptions patch `{recurringEventId}_{yyyyMMdd'T'HHmmss'Z'}` instead of inserting a duplicate. When the row has no Google event id yet, the same tool inserts a new Google event and the workflow writes `google_event_id` back. Setup provisions an origin skip so Google-originated upserts do not loop.

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
- `calendar_event_update` (mapped fields, or unformatted CRM `before`/`after` payloads)
- `calendar_event_delete`

### Sync

- `calendar_sync` (starts one `import_calendar_events` batch; optional `enable_live_sync` registers watches)

### Batch operations

- `import_calendars` (hub backfill: calendars, then events/people/attendees)
- `import_calendar_events` (incremental / `calendar_sync` / live push)

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
- Per-install calendar identity lives on the workplace `calendar` CRM map after Import. Tools, watches, and batch jobs list calendars from the Google API — they do not call `instance.*` on `calendar`. Internal models are only for data shared across installs, so Google does not declare a `google_calendar` internal model
- CRM-facing `calendar` and `calendar_event` entities are mapped per install; events relate to calendars so workplace Calendar LIST view can load events from multiple calendars in one query
- Live `calendar.event.*` workflows stay for a later 1:1 payload, not for pull/history
- CRM record changes push to Google through `push-calendar-event-update-to-google` / `calendar_event_update`
- Gmail and Drive modules exist as stubs only (`src/services/gmail`, `src/services/drive`)
