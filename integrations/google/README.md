# Google Integration

Google Calendar integration for Skedyul with OAuth, incremental sync, push notifications, typed app events, CRM map contracts, and calendar CRUD tools.

Future Google services (Gmail, Drive) are stubbed under `src/services/` but not implemented in v1.

## Features

- OAuth 2.0 install flow with offline refresh tokens
- Full Google Calendar support: list calendars, list/get/create/update/delete events, free/busy queries
- Incremental sync with Google sync tokens
- Push notifications via Google Calendar watch channels
- Typed app events for workflow subscriptions (`app.google.calendar.*`)
- Install-time CRM map for calendar events (`calendar_event` entity)
- Bundled live sync workflow with event wiring UI
- Admin pages for setup, account, linked calendars, and event CRM mapping

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
2. Open **Setup** and complete **Connect Google account** (OAuth)
3. Open **Calendars** and enable sync on the calendars you want (primary is enabled by default on connect)
4. Open **Events** and configure the **Calendar event CRM map**:
   - Map the `calendar_event` entity to your workplace model (e.g. `event` or `appointment`)
   - Set composite match fields: `google_event_id` + `calendar_id`
5. Wire live events on the **Events** page:
   - Subscribe `app.google.calendar.event.created`, `.updated`, and `.deleted` to the bundled workflow `sync-google-calendar-event-from-webhook`
6. Verify: create, edit, or delete an event in Google Calendar and confirm the CRM record upserts

On OAuth connect, the app runs an install backfill sync for the primary calendar so existing events emit without waiting for the first push notification.

## App events

| Event | Workflow type |
|-------|---------------|
| `calendar.event.created` | `app.google.calendar.event.created` |
| `calendar.event.updated` | `app.google.calendar.event.updated` |
| `calendar.event.deleted` | `app.google.calendar.event.deleted` |
| `calendar.sync.completed` | `app.google.calendar.sync.completed` |
| `calendar.sync.failed` | `app.google.calendar.sync.failed` |

The bundled `sync-google-calendar-event-from-webhook` workflow handles the three `calendar.event.*` types and upserts CRM records via the install CRM map (`| google: "format", "calendar_event"`).

## Tools

### Connection / setup

- `fetch_google_connection`
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

## Development

```bash
cd packages/skedyul-integrations/public/integrations/google
pnpm install
pnpm test
pnpm build
```

From the monorepo root:

```bash
pnpm --filter=@skedyul-integrations/google test
pnpm --filter=@skedyul-integrations/google build
```

## Architecture notes

- One Google account per installation (Meta-style)
- Install-scoped `calendar_push` webhooks are created during OAuth
- Internal `google_calendar` model stores sync/watch state per linked calendar (not a workplace CRM map target)
- Workplace CRM events use a single model via the `calendar_event` entity map, tagged by `calendar_id`
- `calendar.sync.*` events are for monitoring; CRM upserts use `calendar.event.*` via the bundled workflow
- Gmail and Drive modules exist as stubs only (`src/services/gmail`, `src/services/drive`)
