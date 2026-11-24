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
- CRM maps for `calendar`, `calendar_event`, `user`, and `attendee`, set up by the workplace in Settings → CRM → Sources (the Setup checklist links there). Map `user` onto a workplace people model (customer/client/contact). Attendees are event×email RSVP rows related to the event and user.
- Bundled workflows; live updates are turned on per setup step in CRM Sources (not a backfill path)
- Admin pages for setup, account, the Google Calendar import hub, and linked sync state

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
2. Open **Setup** and complete **Connect Google account** (OAuth). Use **Reconnect Google** if tokens are missing. Connect only stores tokens. The app subscribes no schedules (see **Live updates** below).
3. Complete **Set up calendars** (its button opens Settings → CRM → Sources):
   - Map the `calendar` entity to your workplace calendar model (`google_calendar_id` match key)
   - Run **Import calendars** on the Google Calendar hub (one batch job). That job also imports events, people, and attendees when those maps are ready
   - Optionally turn on live updates in CRM Sources (`app.google.calendar.created/updated/deleted`) for later single changes — not for history
4. Complete **Set up calendar events** (in CRM Sources):
   - Map the `calendar_event` entity to your workplace event model
   - Set composite match fields: `google_event_id` + `calendar_id` (match keys only — not required on Skedyul create)
   - Map the `calendar` relationship so Calendar LIST view can section by calendar
   - Keep the event `attendees` Google JSON on a field such as `attendee_emails` (do not map that object onto a people relation). RSVP rows live on the `attendee` model.
   - Optionally turn on live updates in CRM Sources (`app.google.calendar.event.*`) for a later 1:1 payload — not for pull sync
5. Complete **Set up calendar people** (in CRM Sources):
   - Map `user` onto customer/client/contact (match `email`)
   - Map `attendee` onto an RSVP/guest model (match `event_attendee_key`)
   - Map attendee `event` → event and `user` → the workplace people field
   - Import calendars also upserts users then attendees (`event: { __crmMatch }` / `user: { __crmMatch }`)
6. On the workplace Event list, set Calendar view **section** to the calendar relationship so events from every synced calendar appear together
7. Live updates: every calendar whose CRM row has `sync_enabled: true` gets a push channel, which is opened by any of these:
   - `add_google_calendar`;
   - `calendar_sync` with `enable_live_sync: true`;
   - a CRM mapping change (setup revalidate);
   - the first calendar view (window pull).

   Each channel points at its own `calendar_push` webhook registration, and that registration is a **platform lease**. The platform calls `calendar_push.renew` shortly before Google's expiry (about a week). `renew` opens a new channel on the same URL, stops the old one and queues one incremental sync. When the calendar is gone or its sync is off, it gives the registration up instead. Each Google ping queues **one** incremental import batch, behind one already running, so no ping is dropped. There are no cron schedules.

Connect never imports history and never emits per-event webhooks.

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

### Outbound sync (Skedyul → Google)

Every calendar edit in Skedyul arrives as `instance.created/updated/deleted` (with the platform's `calendarEdit` envelope). The three push workflows never emit `calendar.event.*` (inbound sync would otherwise upsert a second row), and Google-originated writes carry `meta.origin.appHandle = google`, which the `@crm/...` subscriptions skip, so nothing loops. After every successful write the workflow stores `google_event_id`, `etag`, `html_link` and `updated_at` on the row.

- **Create** (`push-calendar-event-create-to-google`, `@crm/*/created`): reloads the sparse create payload, resolves the Google calendar from the assigned relation, and calls `calendar_event_create` with the recurrence lines (verbatim, `EXDATE;TZID=…`/`RDATE;VALUE=DATE:…` included) and a time zone (row, else the calendar's, else UTC: Google requires one on series). Inserts use the client id `sk` + sha256(CRM instance id), so a retry gets 409 and reads the existing event instead of duplicating it. Rows that already have a `google_event_id` are never inserted.
- **Exceptions** ("this event" edits: `recurring_event_id` + `original_start`, no Google id) PATCH the occurrence `{seriesId}_{stamp}` with every field: `yyyyMMdd` for all-day series, `yyyyMMdd'T'HHmmss'Z'` (UTC) for timed ones. A `recurring_event_id` that is a CRM instance id is resolved through the master row (or the master's deterministic id while its insert is in flight; 404s are retried briefly). Exceptions re-pointed by a "this and following" split, or shifted by an "all events" edit, are re-applied to their new occurrence.
- **Update** (`push-calendar-event-update-to-google`, `@crm/*/updated`): `calendar_event_update` patches only changed fields (cleared fields are sent as cleared, the master's `RRULE … UNTIL` / `EXDATE` lines verbatim) with `If-Match: <etag>`; on 412 it re-reads the event, re-applies the patch and retries once. A changed calendar relation moves the event with `events.move`. A row with no Google id is inserted with the deterministic id. Cancelling an occurrence that Google already removed counts as done.
- **Delete** (`push-calendar-event-delete-to-google`, `@crm/*/deleted`): `calendar_event_delete` honours guest notifications (`send_updates`) and is idempotent (404/410 = deleted).

### Inbound sync (Google → Skedyul)

- Push: `calendar_push` finds the CRM calendar row by `X-Goog-Channel-ID` and checks `X-Goog-Channel-Token` against the random secret stored in `watch_token` (and the resource id) before starting one `import_calendar_events` batch.
- `import_calendar_events` reads the calendar's CRM row, lists with its stored `sync_token`, and saves the new token on the next iterate, once the last page has been upserted. After a 410 it restarts a full sync without the stale token or page token.
- `calendar_window_pull` (calendar views, throttled by the platform) reads every page (bounded, reports `truncated`), skips calendars whose CRM row has `sync_enabled: false`, and only sets `sync_direction` when it creates a calendar row.
- Both apply cancellations: a known row is marked `cancelled`, a cancelled occurrence of a known series is stored as a cancelled exception, and a cancelled event the CRM never had is ignored (so a row deleted in Skedyul is not re-created). A Google copy whose `updated` is not newer than the row's `updated_at` is skipped, so an in-flight local edit is not reverted.
- Google 429 / 403 `rateLimitExceeded` return `RATE_LIMITED` so the platform backs off.

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

- `calendar_event_create` (`crm_instance_id` for an idempotent insert)
- `calendar_event_update` (mapped fields, or unformatted CRM `before`/`after` payloads)
- `calendar_event_delete` (idempotent)

### Sync

- `calendar_sync` (queues one `import_calendar_events` batch; optional `enable_live_sync` opens push channels, which the platform renews)

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

## Uninstall

Uninstall stops every stored push channel (while the refresh token still works; the platform removes the registrations and their renewal timers), revokes the token, then cleans up the CRM. The rule: remove only rows that exist because of the Google import, and keep every event created in Skedyul.

- `attendee` rows (Google guest lists) are deleted.
- Events whose `google_event_id` Skedyul minted (`sk…`, or an occurrence of such a series) are kept with `google_event_id`, `html_link`, `etag` and `updated_at` cleared; their exceptions are re-pointed at the master's CRM id.
- Other events with a `google_event_id` came from Google and are deleted, so a later import does not create a second copy. Events pushed to Google before Skedyul-minted ids existed cannot be told apart from imported ones and are deleted as before.
- Calendar rows still used by a remaining event are kept with their sync token and watch cleared; the rest are deleted.

## Architecture notes

- One Google account per installation (Meta-style)
- Multi-record pulls (Import, `calendar_sync`, push) must start **0 or 1** platform batch jobs. Never `for (event of events) emit()`
- Per-install calendar identity and sync state (`sync_enabled`, `sync_direction`, `sync_token`, `watch_*`) live on the workplace `calendar` CRM row. Writes, the webhook and imports read that row instead of calling `calendarList.list`; calendars that were never imported fall back to the Google list. `instance.*` rows come back keyed by workplace field handles, so reads fall back to the `crmMapDefaults` targets. Internal models are only for data shared across installs, so Google does not declare a `google_calendar` internal model
- Sync flags are only written when a calendar row is created; imports and window pulls never reset them
- CRM-facing `calendar` and `calendar_event` entities are mapped per install; events relate to calendars so workplace Calendar LIST view can load events from multiple calendars in one query
- Live `calendar.event.*` workflows stay for a later 1:1 payload, not for pull/history
- CRM record changes push to Google through `push-calendar-event-update-to-google` / `calendar_event_update`
- Gmail and Drive modules exist as stubs only (`src/services/gmail`, `src/services/drive`)
