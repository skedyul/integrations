import type { ToolDefinition } from 'skedyul'
import { z } from 'skedyul'
import { isRuntimeContext } from 'skedyul'
import { AppAuthInvalidError } from 'skedyul'
import { ensureCalendarWatch } from '../lib/calendar_link'
import { getAuthenticatedOAuthClient } from '../lib/google_client'
import { parseSyncDirection } from '../lib/google_install_env'
import { emitGoogleEvent } from '../lib/emit-google-event'
import { loadGoogleCalendarRecord } from '../services/calendar/sync'
import {
  createAuthError,
  createGoogleError,
  createNotFoundError,
  createSuccessResponse,
  createValidationError,
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
})

type AddGoogleCalendarInput = z.infer<typeof AddGoogleCalendarInputSchema>
type AddGoogleCalendarOutput = z.infer<typeof AddGoogleCalendarOutputSchema>

export const addGoogleCalendarRegistry: ToolDefinition<
  AddGoogleCalendarInput,
  AddGoogleCalendarOutput
> = {
  name: 'add_google_calendar',
  label: 'Add Google Calendar',
  description:
    'Enable sync for a Google Calendar and optionally register push notifications. CRM rows are written by Import / live workflows.',
  inputSchema: AddGoogleCalendarInputSchema,
  outputSchema: AddGoogleCalendarOutputSchema,
  handler: async (input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    try {
      const { client } = await getAuthenticatedOAuthClient(context.env)
      const syncDirection = parseSyncDirection(input.sync_direction)
      const existing = await loadGoogleCalendarRecord(input.calendar_id, context.env)
      if (!existing) {
        return createNotFoundError(`Google calendar ${input.calendar_id} was not found`)
      }

      const record = {
        ...existing,
        summary: input.summary ?? existing.summary ?? input.calendar_id,
        sync_enabled: input.sync_enabled,
        sync_direction: syncDirection,
        external_read_only: input.external_read_only,
      }

      if (input.sync_enabled) {
        await ensureCalendarWatch(client, record)
      }

      await emitGoogleEvent(
        context.appInstallationId,
        'calendar.updated',
        {
          calendar: {
            calendar_id: input.calendar_id,
            summary: record.summary || input.calendar_id,
            primary: Boolean(record.primary),
            timezone: null,
            description: null,
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
      })
    } catch (error) {
      if (error instanceof AppAuthInvalidError) {
        return createAuthError(error.message)
      }
      return createGoogleError(error instanceof Error ? error.message : String(error))
    }
  },
}
