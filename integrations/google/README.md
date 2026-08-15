# Google Integration

Google Calendar integration for Skedyul with OAuth, incremental sync, push notifications, typed app events, CRM maps, batch import, and calendar CRUD tools.

Future Google services (Gmail, Drive) are stubbed under `src/services/` but not implemented in v1.

## Features

- OAuth 2.0 install flow with offline refresh tokens (watch/backfill failures do not drop tokens)
- Reconnect from **Account** or the Setup checklist
- Full Google Calendar support: list calendars, list/get/create/update/delete events, free/busy queries
- Incremental sync with Google sync tokens
- Push notifications via Google Calendar watch channels
- Typed app events for workflow subscriptions (`app.google.calendar.*`)
- Install-time CRM maps for `calendar` and `calendar_event`, including an event → calendar relationship
- Batch import for calendars and events
- Bundled live sync workflows with event wiring UI
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
2. Open **Setup** and complete **Connect Google account** (OAuth). Use **Reconnect Google** if tokens are missing.
3. Complete **Set up calendars**:
   - Map the `calendar` entity to your workplace calendar model (`google_calendar_id` match key)
   - Wire `app.google.calendar.created/updated/deleted` to `sync-google-calendar-from-webhook`
   - Run **Import Calendars** on the Calendars page
4. Complete **Set up calendar events**:
   - Map the `calendar_event` entity to your workplace event model
   - Set composite match fields: `google_event_id` + `calendar_id`
   - Map the `calendar` relationship so Calendar LIST view can section by calendar
   - Wire `app.google.calendar.event.*` to `sync-google-calendar-event-from-webhook`
   - Run **Import Calendar Events** on the Events page
5. On the workplace Event list, set Calendar view **section** to the calendar relationship so events from every synced calendar appear together
6. Verify: create, edit, or delete an event in Google Calendar and confirm the CRM record upserts

On OAuth connect, the app seeds linked calendars and runs an install backfill sync for the primary calendar. A backfill failure is logged and does not block token persistence.

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

- `calendar_sync`

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
- Install-scoped `calendar_push` webhooks are created during OAuth
- Internal `google_calendar` model stores sync/watch state per linked calendar (not a workplace CRM map target)
- CRM-facing `calendar` and `calendar_event` entities are mapped per install; events relate to calendars so workplace Calendar LIST view can load events from multiple calendars in one query
- `calendar.sync.*` events are for monitoring; CRM upserts use `calendar.*` and `calendar.event.*` via the bundled workflows
- CRM → Google two-way sync is not automatic; write tools exist for agents/manual calls
- Gmail and Drive modules exist as stubs only (`src/services/gmail`, `src/services/drive`)
