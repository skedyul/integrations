import { z, type ToolDefinition, createSuccessResponse, createValidationError, createExternalError } from 'skedyul'
import { fetchLiveSchedule } from '../lib/scraper'

const GetScheduleInputSchema = z.object({
  daysAhead: z.number().optional(),
})

const ScheduleEntrySchema = z.object({
  sessionId: z.string(),
  sessionName: z.string(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  duration: z.string(),
  instructor: z.string(),
  capacity: z.number(),
  reserved: z.number(),
  remaining: z.number(),
  status: z.string(),
  address: z.string(),
  sessionTemplate: z.string(),
})

const GetScheduleOutputSchema = z.object({
  schedule: z.record(z.string(), z.array(ScheduleEntrySchema)),
})

type GetScheduleInput = z.infer<typeof GetScheduleInputSchema>
type GetScheduleOutput = z.infer<typeof GetScheduleOutputSchema>

export const getScheduleRegistry: ToolDefinition<
  GetScheduleInput,
  GetScheduleOutput
> = {
  name: 'get_schedule',
  label: 'Get Schedule',
  description:
    'Returns the live class schedule from BFT (always fresh from the Hapana API)',
  inputSchema: GetScheduleInputSchema,
  outputSchema: GetScheduleOutputSchema,
  handler: async (input, context) => {
    const { BFT_URL, HAPANA_SITE_ID } = context.env

    if (!BFT_URL) {
      return createValidationError('BFT_URL environment variable is not set')
    }

    try {
      if (!HAPANA_SITE_ID) {
        return createValidationError('HAPANA_SITE_ID is not set. Please re-install the app.')
      }

      const siteId = HAPANA_SITE_ID
      const daysAhead = input.daysAhead ?? 14

      const schedule = await fetchLiveSchedule(BFT_URL, siteId, daysAhead)

      return createSuccessResponse({ schedule })
    } catch (error) {
      return createExternalError(
        'BFT',
        error instanceof Error ? error.message : 'Failed to fetch schedule',
      )
    }
  },
}
