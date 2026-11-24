import type { ToolDefinition } from 'skedyul'
import { instance, z } from 'skedyul'
import { isRuntimeContext } from 'skedyul'
import { ensureCalendarWatch, removeCalendarWatch } from '../lib/calendar_link'
import { toCalendarSummary } from '../lib/calendar-event-import'
import { updateCrmCalendarSyncState } from '../lib/crm-calendars'
import { getAuthenticatedOAuthClient } from '../lib/google_client'
import { parseSyncDirection } from '../lib/google_install_env'
import { emitGoogleEvent } from '../lib/emit-google-event'
import { toCalendarEntityPayload } from '../lib/seed-google-calendars'
import { ensureSyncSchedulesOnce } from '../lib/sync-schedules'
import { loadGoogleCalendarRecord } from '../services/calendar/sync'
import type { GoogleCalendarRecord } from '../events/types'
import {
  createNotFoundError,
  createSuccessResponse,
  createValidationError,
  googleToolFailure,
} from '../lib/response'

const AddGoogleCalendarInputSchema = z.object({
  calendar_id: z.string().min(1),
  summary: z.string().optional(),
  sync_enabled: z.boolean().optional().default(true),
  sync_direction: z.enum(['push', 'pull', 'both']).optional().default('both'),
  external_read_only: z.boolean().optional().default(false),
})

const AddGoogleCalendarOutputSchema = z.object({
  calendar_id: z.string(),
  summary: z.string(),
  sync_enabled: z.boolean(),
  sync_direction: z.enum(['push', 'pull', 'both']),
  external_read_only: z.boolean(),
  live_sync: z.boolean(),
})

type AddGoogleCalendarInput = z.infer<typeof AddGoogleCalendarInputSchema>
type AddGoogleCalendarOutput = z.infer<typeof AddGoogleCalendarOutputSchema>

export const addGoogleCalendarRegistry: ToolDefinition<
  AddGoogleCalendarInput,
  AddGoogleCalendarOutput
> = {
  name: 'add_google_calendar',
  label: 'Add Google Calendar',
  ui: {
    title: 'Added calendar',
    activeTitle: 'Adding calendar',
    targetArg: 'summary',
  },
  description:
    'Save sync settings for a Google Calendar on its CRM calendar row (creating the row if needed) and, when sync is enabled, open a push channel for live updates.',
  timeout: 60_000,
  inputSchema: AddGoogleCalendarInputSchema,
  outputSchema: AddGoogleCalendarOutputSchema,
  handler: async (input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    try {
      if (!(await instance.isConfigured('calendar'))) {
        return createValidationError(
          'Map the Google calendar entity in Settings → CRM → Sources before adding calendars',
        )
      }

      const { client } = await getAuthenticatedOAuthClient(context.env)
      const syncDirection = parseSyncDirection(input.sync_direction)
      const existing = await loadGoogleCalendarRecord(input.calendar_id, context.env)
      if (!existing) {
        return createNotFoundError(`Google calendar ${input.calendar_id} was not found`)
      }

      const flags = {
        sync_enabled: input.sync_enabled,
        sync_direction: syncDirection,
        external_read_only: input.external_read_only,
      }
      let record: GoogleCalendarRecord = {
        ...existing,
        summary: input.summary ?? existing.summary ?? input.calendar_id,
        ...flags,
      }

      if (existing.crm_instance_id) {
        await updateCrmCalendarSyncState(existing, flags)
      } else {
        const { results, errors } = await instance.upsertMany(
          'calendar',
          [toCalendarEntityPayload(toCalendarSummary(record), record)],
          'google_calendar_id',
        )
        if (errors.length > 0 || !results[0]) {
          throw new Error(
            `Failed to save calendar ${input.calendar_id}: ${errors[0]?.error ?? 'no row returned'}`,
          )
        }
        record = { ...record, crm_instance_id: results[0].id, id: results[0].id }
      }

      if (input.sync_enabled) {
        record = await ensureCalendarWatch(client, record)
      } else {
        await removeCalendarWatch(client, record)
      }

      await ensureSyncSchedulesOnce(context.appInstallationId)

      await emitGoogleEvent(
        context.appInstallationId,
        'calendar.updated',
        {
          calendar: {
            calendar_id: input.calendar_id,
            summary: record.summary || input.calendar_id,
            primary: Boolean(record.primary),
            timezone: record.timezone ?? null,
            description: record.description ?? null,
          },
          sync: { trigger: 'tool' },
        },
        `tool:${input.calendar_id}`,
        'tool',
      )

      return createSuccessResponse({
        calendar_id: input.calendar_id,
        summary: record.summary || input.calendar_id,
        sync_enabled: Boolean(input.sync_enabled),
        sync_direction: syncDirection,
        external_read_only: Boolean(input.external_read_only),
        live_sync: Boolean(input.sync_enabled && record.watch_channel_id),
      })
    } catch (error) {
      return googleToolFailure(error)
    }
  },
}
