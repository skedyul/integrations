/**
 * Zod payload schemas for Google app events.
 */

import { z } from 'skedyul'
import type { GoogleEventName } from './types'

const nullableString = z.string().nullable()

export const GoogleCalendarContextSchema = z
  .object({
    calendar_id: z.string().min(1),
    summary: z.string().min(1),
  })
  .strict()

export const GoogleEventAttendeeSchema = z
  .object({
    email: z.string().email(),
    response_status: nullableString.optional(),
  })
  .strict()

export const GoogleEventEntitySchema = z
  .object({
    google_event_id: z.string().min(1),
    status: z.string().min(1),
    summary: nullableString,
    description: nullableString,
    start: nullableString,
    end: nullableString,
    timezone: nullableString,
    all_day: z.boolean(),
    recurrence: z.array(z.string()).nullable(),
    attendees: z.array(GoogleEventAttendeeSchema),
    location: nullableString,
    html_link: nullableString,
    updated_at: nullableString,
    etag: nullableString,
  })
  .strict()

export const GoogleSyncDirectionSchema = z.enum(['push', 'pull', 'both'])
export const GoogleSyncTriggerSchema = z.enum(['manual', 'push', 'install', 'tool'])

export const GoogleEventSyncContextSchema = z
  .object({
    direction: GoogleSyncDirectionSchema,
    trigger: GoogleSyncTriggerSchema,
  })
  .strict()

export const GoogleCalendarEventPayloadSchema = z
  .object({
    calendar: GoogleCalendarContextSchema,
    event: GoogleEventEntitySchema,
    sync: GoogleEventSyncContextSchema,
  })
  .strict()

export const GoogleSyncCompletedPayloadSchema = z
  .object({
    calendar: GoogleCalendarContextSchema,
    sync: GoogleEventSyncContextSchema.extend({
      events_created: z.number().int().nonnegative(),
      events_updated: z.number().int().nonnegative(),
      events_deleted: z.number().int().nonnegative(),
    }),
  })
  .strict()

export const GoogleSyncFailedPayloadSchema = z
  .object({
    calendar: GoogleCalendarContextSchema,
    sync: GoogleEventSyncContextSchema.extend({
      error: z.string().min(1),
    }),
  })
  .strict()

export const GOOGLE_EVENT_PAYLOAD_SCHEMAS = {
  'calendar.event.created': GoogleCalendarEventPayloadSchema,
  'calendar.event.updated': GoogleCalendarEventPayloadSchema,
  'calendar.event.deleted': GoogleCalendarEventPayloadSchema,
  'calendar.sync.completed': GoogleSyncCompletedPayloadSchema,
  'calendar.sync.failed': GoogleSyncFailedPayloadSchema,
} as const satisfies Record<GoogleEventName, z.ZodType>

export type GoogleEventPayloadInferred<T extends GoogleEventName = GoogleEventName> =
  z.infer<(typeof GOOGLE_EVENT_PAYLOAD_SCHEMAS)[T]>

export function parseGoogleEventPayload<T extends GoogleEventName>(
  eventName: T,
  payload: unknown,
): GoogleEventPayloadInferred<T> {
  return GOOGLE_EVENT_PAYLOAD_SCHEMAS[eventName].parse(payload) as GoogleEventPayloadInferred<T>
}

export function isGoogleEventName(value: string): value is GoogleEventName {
  return value in GOOGLE_EVENT_PAYLOAD_SCHEMAS
}
