import type { ToolDefinition } from 'skedyul'
import { z } from 'skedyul'
import { isRuntimeContext } from 'skedyul'
import { AppAuthInvalidError } from 'skedyul'
import { assertCalendarWritable } from '../lib/calendar_link'
import {
  attendeeEmails,
  asBoolean,
  blankToUndefined,
  buildCalendarEventCreateInput,
  buildCalendarEventUpdatePatch,
  calendarEventIds,
  parseJsonRecord,
  withCalendarId,
} from '../lib/calendar-event-update-patch'
import { getAuthenticatedOAuthClient } from '../lib/google_client'
import { createGoogleEvent } from '../lib/create-google-event'
import {
  createGoogleCalendarEvent,
  getGoogleCalendarEvent,
  updateGoogleCalendarEvent,
} from '../services/calendar/client'
import { normalizeGoogleCalendarEvent } from '../services/calendar/normalize'
import { loadGoogleCalendarRecord } from '../services/calendar/sync'
import {
  createAuthError,
  createGoogleError,
  createNotFoundError,
  createSuccessResponse,
  createValidationError,
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
  recurrence: z.array(z.string()).optional(),
  status: optionalString,
  /** Unformatted calendar_event payload from `| google: "unformat"` */
  before: z.preprocess(blankToUndefined, JsonRecordSchema.optional()),
  after: z.preprocess(blankToUndefined, JsonRecordSchema.optional()),
  send_updates: z.enum(['all', 'externalOnly', 'none']).optional(),
})

const CalendarEventUpdateOutputSchema = z.object({
  event: z.object({
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
  }),
})

type CalendarEventUpdateInput = z.infer<typeof CalendarEventUpdateInputSchema>
type CalendarEventUpdateOutput = z.infer<typeof CalendarEventUpdateOutputSchema>

type ResolvedWrite =
  | { kind: 'patch'; patch: NonNullable<ReturnType<typeof buildCalendarEventUpdatePatch>> }
  | { kind: 'insert'; input: NonNullable<ReturnType<typeof buildCalendarEventCreateInput>> }
  | { kind: 'get'; eventId: string }
  | { kind: 'invalid'; message: string }

function trimToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function resolveWrite(input: CalendarEventUpdateInput): ResolvedWrite {
  const eventId = trimToUndefined(input.event_id)

  if (input.after != null && input.after !== '') {
    const after = withCalendarId(parseJsonRecord(input.after), input.calendar_id)
    if (!after) {
      return {
        kind: 'invalid',
        message: 'after payload must be a JSON object',
      }
    }
    const patch = buildCalendarEventUpdatePatch(parseJsonRecord(input.before), after)
    if (patch) {
      return {
        kind: 'patch',
        patch: { ...patch, send_updates: input.send_updates },
      }
    }
    const ids = calendarEventIds(after, input.calendar_id)
    if (ids) {
      return { kind: 'get', eventId: ids.event_id }
    }
    const createInput = buildCalendarEventCreateInput(after, input.calendar_id)
    if (createInput) {
      return {
        kind: 'insert',
        input: { ...createInput, send_updates: input.send_updates },
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
    patch: {
      calendar_id: input.calendar_id,
      event_id: eventId,
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

export const calendarEventUpdateRegistry: ToolDefinition<
  CalendarEventUpdateInput,
  CalendarEventUpdateOutput
> = {
  name: 'calendar_event_update',
  label: 'Update Calendar Event',
  description:
    'Update a Google Calendar event, or create it when the CRM record has no Google event id yet. Pass mapped fields directly, or unformatted CRM before/after payloads from the install map.',
  inputSchema: CalendarEventUpdateInputSchema,
  outputSchema: CalendarEventUpdateOutputSchema,
  handler: async (input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    try {
      const record = await loadGoogleCalendarRecord(input.calendar_id, context.env)
      if (!record) {
        return createNotFoundError(`Calendar ${input.calendar_id} is not linked`)
      }

      assertCalendarWritable(record)

      const { client } = await getAuthenticatedOAuthClient(context.env)
      const write = resolveWrite(input)
      if (write.kind === 'invalid') {
        return createValidationError(write.message)
      }

      // Insert without emitting calendar.event.created — inbound sync would
      // upsert a second CRM row because the workplace event has no Google id yet.
      const updated =
        write.kind === 'insert'
          ? await createGoogleCalendarEvent(client, write.input.calendar_id, write.input)
          : write.kind === 'patch'
            ? await updateGoogleCalendarEvent(
                client,
                write.patch.calendar_id,
                write.patch.event_id,
                write.patch,
              )
            : await getGoogleCalendarEvent(client, input.calendar_id, write.eventId)
      const normalized = normalizeGoogleCalendarEvent(updated)

      if (write.kind === 'patch') {
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

      return createSuccessResponse({ event: normalized })
    } catch (error) {
      if (error instanceof AppAuthInvalidError) {
        return createAuthError(error.message)
      }
      return createGoogleError(error instanceof Error ? error.message : String(error))
    }
  },
}
