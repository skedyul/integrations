import type { ToolDefinition } from 'skedyul'
import { z } from 'skedyul'
import { isRuntimeContext } from 'skedyul'
import type { calendar_v3 } from 'googleapis'
import { assertCalendarWritable } from '../lib/calendar_link'
import {
  asBoolean,
  asString,
  attendeeEmails,
  blankToUndefined,
  buildCalendarEventCreateInput,
  buildCalendarEventFullBody,
  buildCalendarEventUpdatePatch,
  calendarEventIds,
  isSeriesException,
  parseJsonRecord,
  parseRecurrenceLines,
  seriesLinkChanged,
} from '../lib/calendar-event-update-patch'
import { getCrmCalendarRecord } from '../lib/crm-calendars'
import { getAuthenticatedOAuthClient } from '../lib/google_client'
import { isGoogleNotFound } from '../lib/google-errors'
import { createGoogleEvent } from '../lib/create-google-event'
import { resolveSeriesInstanceId } from '../lib/series-instance'
import {
  getGoogleCalendarEvent,
  type GoogleCalendarEventInput,
} from '../services/calendar/client'
import {
  asGoogleEventId,
  isGoogleThisAndFollowingMasterId,
  RECURRING_EVENT_FALLBACK_TIMEZONE,
} from '../services/calendar/event-datetime'
import { skedyulGoogleEventId } from '../services/calendar/event-ids'
import { normalizeGoogleCalendarEvent } from '../services/calendar/normalize'
import { loadGoogleCalendarRecord } from '../services/calendar/sync'
import {
  insertEventIdempotent,
  moveEvent,
  patchEventWithEtag,
  patchSeriesInstance,
} from '../services/calendar/writes'
import {
  createNotFoundError,
  createSuccessResponse,
  createValidationError,
  googleToolFailure,
} from '../lib/response'

const AttendeeSchema = z.union([
  z.string(),
  z.object({ email: z.string() }),
])

const JsonRecordSchema = z.union([
  z.record(z.string(), z.unknown()),
  z.string(),
])

const optionalString = z.preprocess(blankToUndefined, z.string().optional())

const CalendarEventUpdateInputSchema = z.object({
  calendar_id: z.string().min(1),
  event_id: optionalString,
  summary: optionalString,
  description: optionalString,
  location: optionalString,
  start: optionalString,
  end: optionalString,
  timezone: optionalString,
  all_day: z.preprocess(
    blankToUndefined,
    z.union([z.boolean(), z.string()]).optional(),
  ),
  attendees: z.array(AttendeeSchema).optional(),
  recurrence: z.preprocess(parseRecurrenceLines, z.array(z.string()).optional()),
  status: optionalString,
  /** Unformatted calendar_event payload from `| google: "unformat"` */
  before: z.preprocess(blankToUndefined, JsonRecordSchema.optional()),
  after: z.preprocess(blankToUndefined, JsonRecordSchema.optional()),
  /** CRM instance id of the row; seeds the deterministic id when it must be inserted. */
  crm_instance_id: optionalString,
  /** Google calendar id before this change (events.move when it differs). */
  previous_calendar_id: optionalString,
  /** CRM calendar instance id before this change, when the Google id is not on the event. */
  previous_calendar_instance_id: optionalString,
  /** Platform `calendarEdit` envelope ({ action, scope, masterId?, originalStart? }). */
  calendar_edit: z.preprocess(blankToUndefined, JsonRecordSchema.optional()),
  send_updates: z.enum(['all', 'externalOnly', 'none']).optional(),
  /** Set false on CRM outbound pushes so inbound sync does not upsert a second row. */
  emit_event: z.preprocess(
    blankToUndefined,
    z.union([z.boolean(), z.string()]).optional(),
  ),
})

const EventOutputSchema = z.object({
  google_event_id: z.string(),
  status: z.string(),
  summary: z.string().nullable(),
  description: z.string().nullable(),
  start: z.string().nullable(),
  end: z.string().nullable(),
  timezone: z.string().nullable(),
  all_day: z.boolean(),
  recurrence: z.array(z.string()).nullable(),
  recurring_event_id: z.string().nullable(),
  original_start: z.string().nullable(),
  attendees: z.array(
    z.object({
      email: z.string(),
      response_status: z.string().nullable().optional(),
    }),
  ),
  location: z.string().nullable(),
  html_link: z.string().nullable(),
  updated_at: z.string().nullable(),
  etag: z.string().nullable(),
})

const CalendarEventUpdateOutputSchema = z.object({
  event: EventOutputSchema,
  /**
   * patch | instance | insert | existing (nothing to change) |
   * gone (a cancellation whose Google event no longer exists; nothing to write back)
   */
  write: z.enum(['patch', 'instance', 'insert', 'existing', 'gone']),
  moved: z.boolean(),
  /** True when the CRM row should store the returned Google id/etag/link/updated time. */
  writeback: z.boolean(),
})

type CalendarEventUpdateInput = z.infer<typeof CalendarEventUpdateInputSchema>
type CalendarEventUpdateOutput = z.infer<typeof CalendarEventUpdateOutputSchema>

export type CalendarEventWritePlan =
  | {
      kind: 'patch'
      eventId: string
      body: GoogleCalendarEventInput
      etag?: string
      /** Stored Google id of a non-exception row (eligible for events.move). */
      movable: boolean
    }
  | {
      kind: 'instance'
      recurringEventId: string
      originalStart: string
      allDay?: boolean
      body: GoogleCalendarEventInput
    }
  | { kind: 'insert'; body: GoogleCalendarEventInput; eventId?: string }
  | { kind: 'get'; eventId: string; movable: boolean }
  | { kind: 'invalid'; message: string }

function trimToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function isCancelled(body: GoogleCalendarEventInput): boolean {
  return body.status === 'cancelled'
}

/**
 * Decide which Google write a CRM change needs. Pure: no I/O.
 *
 * - Exception rows (recurring_event_id + original_start) that were never
 *   pushed, or that moved to another series slot, PATCH the full edit onto
 *   the Google occurrence `{series}_{stamp}`.
 * - Rows with a Google id PATCH only the changed fields (If-Match etag).
 * - Rows without a Google id insert with the deterministic id.
 */
export function planCalendarEventWrite(input: CalendarEventUpdateInput): CalendarEventWritePlan {
  const eventId = trimToUndefined(input.event_id)

  if (input.after != null && input.after !== '') {
    const parsedAfter = parseJsonRecord(input.after)
    if (!parsedAfter) {
      return { kind: 'invalid', message: 'after payload must be a JSON object' }
    }
    // The workflow resolved the target calendar (relation first when it changed).
    const after: Record<string, unknown> = { ...parsedAfter, calendar_id: input.calendar_id }
    const before = parseJsonRecord(input.before)
    const storedId =
      asGoogleEventId(asString(after.google_event_id)) ?? asGoogleEventId(eventId)

    // A Google "this and following" split master (`…_R…`) can carry its own
    // id as recurring_event_id plus an original start: it is a master.
    const storedIsSplitMaster = storedId != null && isGoogleThisAndFollowingMasterId(storedId)
    if (isSeriesException(after) && !storedIsSplitMaster) {
      const recurringEventId = asString(after.recurring_event_id) as string
      const originalStart = asString(after.original_start) as string
      const storedIsMaster = storedId != null && storedId === asGoogleEventId(recurringEventId)
      if (!storedId || storedIsMaster || seriesLinkChanged(before, after)) {
        return {
          kind: 'instance',
          recurringEventId,
          originalStart,
          allDay: asBoolean(after.all_day),
          body: { ...buildCalendarEventFullBody(after), send_updates: input.send_updates },
        }
      }
    }

    const patch = buildCalendarEventUpdatePatch(before, after)
    if (patch) {
      const exception = isSeriesException(after)
      return {
        kind: 'patch',
        eventId: patch.event_id,
        body: { ...patch, send_updates: input.send_updates },
        // Rows cloned from a master can carry the master's etag; only trust an
        // etag stored alongside this row's own Google id.
        etag: storedId && storedId === patch.event_id ? asString(after.etag) : undefined,
        movable: !exception && storedId === patch.event_id,
      }
    }
    const ids = calendarEventIds(after, input.calendar_id)
    if (ids) {
      return {
        kind: 'get',
        eventId: ids.event_id,
        movable: !isSeriesException(after) && storedId === ids.event_id,
      }
    }
    const createInput = buildCalendarEventCreateInput(after, input.calendar_id)
    if (createInput) {
      const crmInstanceId = trimToUndefined(input.crm_instance_id)
      return {
        kind: 'insert',
        body: { ...createInput, send_updates: input.send_updates },
        eventId: crmInstanceId ? skedyulGoogleEventId(crmInstanceId) : undefined,
      }
    }
    return {
      kind: 'invalid',
      message:
        'event_id is required unless the after payload includes a Google event id, series instance, or enough fields to create the event',
    }
  }

  if (!eventId) {
    return {
      kind: 'invalid',
      message:
        'event_id is required unless the after payload includes a Google event id or series instance',
    }
  }

  return {
    kind: 'patch',
    eventId,
    movable: false,
    body: {
      summary: input.summary,
      description: input.description,
      location: input.location,
      start: input.start,
      end: input.end,
      timezone: input.timezone,
      all_day: asBoolean(input.all_day),
      attendees: attendeeEmails(input.attendees),
      recurrence: input.recurrence,
      status: input.status,
      send_updates: input.send_updates,
    },
  }
}

function shouldEmit(value: unknown): boolean {
  return !(value === false || value === 'false' || value === 0 || value === '0')
}

function isDeleteEdit(value: unknown): boolean {
  const edit = parseJsonRecord(value)
  return asString(edit?.action) === 'delete'
}

async function resolvePreviousCalendarId(
  input: CalendarEventUpdateInput,
): Promise<string | undefined> {
  const direct = trimToUndefined(input.previous_calendar_id)
  if (direct) return direct
  const instanceId = trimToUndefined(input.previous_calendar_instance_id)
  if (!instanceId) return undefined
  const previous = await getCrmCalendarRecord(instanceId)
  return previous?.calendar_id || undefined
}

function goneEvent(eventId: string): calendar_v3.Schema$Event {
  return { id: eventId, status: 'cancelled' }
}

export const calendarEventUpdateRegistry: ToolDefinition<
  CalendarEventUpdateInput,
  CalendarEventUpdateOutput
> = {
  name: 'calendar_event_update',
  label: 'Update Calendar Event',
  ui: {
    title: 'Updated calendar event',
    activeTitle: 'Updating calendar event',
    targetArg: 'summary',
  },
  description:
    'Update a Google Calendar event, or create it when the CRM record has no Google event id yet. Pass mapped fields directly, or unformatted CRM before/after payloads from the install map. Exceptions patch their series occurrence; a changed calendar moves the event.',
  timeout: 60_000,
  inputSchema: CalendarEventUpdateInputSchema,
  outputSchema: CalendarEventUpdateOutputSchema,
  handler: async (input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    try {
      const plan = planCalendarEventWrite(input)
      if (plan.kind === 'invalid') {
        return createValidationError(plan.message)
      }

      const record = await loadGoogleCalendarRecord(input.calendar_id, context.env)
      if (!record) {
        return createNotFoundError(`Calendar ${input.calendar_id} is not linked`)
      }

      assertCalendarWritable(record)

      const { client } = await getAuthenticatedOAuthClient(context.env)
      const toleratesGone = isDeleteEdit(input.calendar_edit)

      let moved: calendar_v3.Schema$Event | null = null
      if ((plan.kind === 'patch' || plan.kind === 'get') && plan.movable) {
        const previousCalendarId = await resolvePreviousCalendarId(input)
        if (previousCalendarId && previousCalendarId !== input.calendar_id) {
          moved = await moveEvent(
            client,
            previousCalendarId,
            plan.eventId,
            input.calendar_id,
            input.send_updates,
          )
        }
      }

      let write: CalendarEventUpdateOutput['write']
      let googleEvent: calendar_v3.Schema$Event
      let insertedRow = false

      if (plan.kind === 'instance') {
        const resolved = await resolveSeriesInstanceId({
          recurring_event_id: plan.recurringEventId,
          original_start: plan.originalStart,
          all_day: plan.allDay,
        })
        if (!resolved) {
          if (isCancelled(plan.body) || toleratesGone) {
            return createSuccessResponse({
              event: normalizeGoogleCalendarEvent(goneEvent(plan.recurringEventId)),
              write: 'gone' as const,
              moved: false,
              writeback: false,
            })
          }
          return createNotFoundError(
            `Series ${plan.recurringEventId} for this exception no longer exists`,
          )
        }
        const patched = await patchSeriesInstance(
          client,
          input.calendar_id,
          resolved.instanceId,
          plan.body,
        )
        googleEvent = patched ?? goneEvent(resolved.instanceId)
        write = patched ? 'instance' : 'gone'
      } else if (plan.kind === 'patch') {
        try {
          googleEvent = await patchEventWithEtag(client, input.calendar_id, plan.eventId, plan.body, {
            etag: moved ? (moved.etag ?? null) : (plan.etag ?? null),
          })
          write = 'patch'
        } catch (error) {
          if (!isGoogleNotFound(error) || !(isCancelled(plan.body) || toleratesGone)) {
            throw error
          }
          googleEvent = goneEvent(plan.eventId)
          write = 'gone'
        }
      } else if (plan.kind === 'get') {
        googleEvent =
          moved ?? (await getGoogleCalendarEvent(client, input.calendar_id, plan.eventId))
        write = 'existing'
      } else {
        const body = plan.body
        const timezone =
          body.timezone ??
          (body.recurrence && body.recurrence.length > 0 && !body.all_day
            ? record.timezone || RECURRING_EVENT_FALLBACK_TIMEZONE
            : undefined)
        const inserted = await insertEventIdempotent(
          client,
          input.calendar_id,
          { ...body, timezone },
          { eventId: plan.eventId },
        )
        googleEvent = inserted.event
        write = inserted.created ? 'insert' : 'existing'
        insertedRow = true
      }

      const normalized = normalizeGoogleCalendarEvent(googleEvent)
      const writeback =
        write === 'patch' || write === 'instance' || insertedRow || moved != null

      if ((write === 'patch' || write === 'instance') && shouldEmit(input.emit_event)) {
        await createGoogleEvent(
          'calendar.event.updated',
          {
            calendar: {
              calendar_id: input.calendar_id,
              summary: record.summary || input.calendar_id,
            },
            event: normalized,
            sync: {
              direction: record.sync_direction ?? 'both',
              trigger: 'tool',
            },
          },
          { trigger: 'tool' },
        )
      }

      return createSuccessResponse({
        event: normalized,
        write,
        moved: moved != null,
        writeback: writeback && write !== 'gone',
      })
    } catch (error) {
      return googleToolFailure(error)
    }
  },
}
