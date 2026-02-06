import { z, type ToolDefinition, instance } from 'skedyul'
import { scrapeBftWebsite } from '../lib/scraper'
import { createToolResponse } from '../lib/response'

const GetScheduleInputSchema = z.object({})

const GetScheduleOutputSchema = z.object({
  schedule: z.record(
    z.string(),
    z.array(
      z.object({
        time: z.string(),
        class: z.string(),
        instructor: z.string().optional(),
      }),
    ),
  ),
})

type GetScheduleInput = z.infer<typeof GetScheduleInputSchema>
type GetScheduleOutput = z.infer<typeof GetScheduleOutputSchema>

export const getScheduleRegistry: ToolDefinition<
  GetScheduleInput,
  GetScheduleOutput
> = {
  name: 'get_schedule',
  label: 'Get Schedule',
  description: 'Scrapes and returns the current class schedule from the BFT website (always fresh)',
  inputSchema: GetScheduleInputSchema,
  outputSchema: GetScheduleOutputSchema,
  handler: async (input, context) => {
    const { BFT_URL } = context.env

    if (!BFT_URL) {
      return createToolResponse<GetScheduleOutput>('get_schedule', {
        success: false,
        error: 'BFT_URL environment variable is not set',
      })
    }

    try {
      const data = await scrapeBftWebsite(BFT_URL)

      return createToolResponse('get_schedule', {
        success: true,
        data: {
          schedule: data.schedule,
        },
        message: 'Schedule retrieved successfully',
      })
    } catch (error) {
      return createToolResponse<GetScheduleOutput>('get_schedule', {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to scrape schedule',
      })
    }
  },
}
