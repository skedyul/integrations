import { z, type ToolDefinition } from 'skedyul'
import { fetchLiveSchedule } from '../lib/scraper'
import { createToolResponse } from '../lib/response'

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
      return createToolResponse<GetScheduleOutput>('get_schedule', {
        success: false,
        error: 'BFT_URL environment variable is not set',
      })
    }

    try {
      if (!HAPANA_SITE_ID) {
        return createToolResponse<GetScheduleOutput>('get_schedule', {
          success: false,
          error: 'HAPANA_SITE_ID is not set. Please re-install the app.',
        })
      }

      const siteId = HAPANA_SITE_ID
      const daysAhead = input.daysAhead ?? 14

      const schedule = await fetchLiveSchedule(BFT_URL, siteId, daysAhead)

      const totalSessions = Object.values(schedule).reduce(
        (sum, day) => sum + day.length,
        0,
      )

      return createToolResponse('get_schedule', {
        success: true,
        data: { schedule },
        message: `Found ${totalSessions} sessions across ${Object.keys(schedule).length} days`,
      })
    } catch (error) {
      return createToolResponse<GetScheduleOutput>('get_schedule', {
        success: false,
        error: error instanceof Error
          ? error.message
          : 'Failed to fetch schedule',
      })
    }
  },
}
