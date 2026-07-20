# Google Integration

Google Calendar integration for Skedyul with OAuth, incremental sync, push notifications, typed app events, and calendar CRUD tools.

Future Google services (Gmail, Drive) are stubbed under `src/services/` but not implemented in v1.

## Features

- OAuth 2.0 install flow with offline refresh tokens
- Full Google Calendar support: list calendars, list/get/create/update/delete events, free/busy queries
- Incremental sync with Google sync tokens
- Push notifications via Google Calendar watch channels
- Typed app events for workflow subscriptions (`app.google.calendar.*`)
- Admin pages for account connection and linked calendars

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

## App events

| Event | Workflow type |
|-------|---------------|
| `calendar.event.created` | `app.google.calendar.event.created` |
| `calendar.event.updated` | `app.google.calendar.event.updated` |
| `calendar.event.deleted` | `app.google.calendar.event.deleted` |
| `calendar.sync.completed` | `app.google.calendar.sync.completed` |
| `calendar.sync.failed` | `app.google.calendar.sync.failed` |

Subscribe workflows to these events to sync Google Calendar data into CRM models.

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
- CRM writes from sync should be handled by workflows subscribing to app events (see `docs/integrations/INTEGRATION_SYNC_PATTERNS.md`)
- Gmail and Drive modules exist as stubs only (`src/services/gmail`, `src/services/drive`)
