import type { ToolDefinition } from 'skedyul'
import { z } from 'skedyul'
import { instance } from 'skedyul'
import { isRuntimeContext } from 'skedyul'
import { AppAuthInvalidError } from 'skedyul'
import { ensureCalendarWatch } from '../lib/calendar_link'
import { getAuthenticatedOAuthClient } from '../lib/google_client'
import { parseSyncDirection } from '../lib/google_install_env'
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
  description: 'Link a Google Calendar for sync and register push notifications',
  inputSchema: AddGoogleCalendarInputSchema,
  outputSchema: AddGoogleCalendarOutputSchema,
  handler: async (input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    try {
      const { client } = await getAuthenticatedOAuthClient(context.env)
      const syncDirection = parseSyncDirection(input.sync_direction)
      const existing = await loadGoogleCalendarRecord(input.calendar_id)

      let recordId: string
      if (existing) {
        recordId = existing.id
        await instance.update('google_calendar', recordId, {
          summary: input.summary ?? existing.summary ?? input.calendar_id,
          sync_enabled: input.sync_enabled,
          sync_direction: syncDirection,
          external_read_only: input.external_read_only,
        })
      } else {
        const created = await instance.create('google_calendar', {
          calendar_id: input.calendar_id,
          summary: input.summary ?? input.calendar_id,
          sync_enabled: input.sync_enabled,
          sync_direction: syncDirection,
          external_read_only: input.external_read_only,
        })
        recordId = (created as { id: string }).id
      }

      const updated = await loadGoogleCalendarRecord(input.calendar_id)
      if (!updated) {
        return createNotFoundError('Linked calendar record was not found after create/update')
      }

      if (input.sync_enabled) {
        await ensureCalendarWatch(client, updated)
      }

      return createSuccessResponse({
        calendar_id: input.calendar_id,
        summary: updated.summary || input.calendar_id,
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
