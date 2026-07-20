/**
 * Tool & Webhook Registries
 */

import type { ToolRegistry, WebhookRegistry } from 'skedyul'

import { fetchGoogleConnectionRegistry } from './tools/fetch_google_connection'
import { calendarsListRegistry } from './tools/calendars_list'
import { addGoogleCalendarRegistry } from './tools/add_google_calendar'
import { removeGoogleCalendarRegistry } from './tools/remove_google_calendar'
import { calendarEventsListRegistry } from './tools/calendar_events_list'
import { calendarEventGetRegistry } from './tools/calendar_event_get'
import { calendarFreeBusyQueryRegistry } from './tools/calendar_freebusy_query'
import { calendarEventCreateRegistry } from './tools/calendar_event_create'
import { calendarEventUpdateRegistry } from './tools/calendar_event_update'
import { calendarEventDeleteRegistry } from './tools/calendar_event_delete'
import { calendarSyncRegistry } from './tools/calendar_sync'
import { calendarPushRegistry } from './webhooks/calendar_push'

export const toolRegistry: ToolRegistry = {
  fetch_google_connection: fetchGoogleConnectionRegistry,
  calendars_list: calendarsListRegistry,
  add_google_calendar: addGoogleCalendarRegistry,
  remove_google_calendar: removeGoogleCalendarRegistry,
  calendar_events_list: calendarEventsListRegistry,
  calendar_event_get: calendarEventGetRegistry,
  calendar_freebusy_query: calendarFreeBusyQueryRegistry,
  calendar_event_create: calendarEventCreateRegistry,
  calendar_event_update: calendarEventUpdateRegistry,
  calendar_event_delete: calendarEventDeleteRegistry,
  calendar_sync: calendarSyncRegistry,
}

export const webhookRegistry: WebhookRegistry = {
  calendar_push: calendarPushRegistry,
}
