import { z, type ToolDefinition } from 'skedyul'
import { scrapeAndSync } from '../lib/sync'
import { createToolResponse } from '../lib/response'

const RefreshDataInputSchema = z.object({})

const RefreshDataOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  packagesCreated: z.number(),
  packagesUpdated: z.number(),
  classesCreated: z.number(),
  classesUpdated: z.number(),
  businessDetailsUpdated: z.boolean(),
})

type RefreshDataInput = z.infer<typeof RefreshDataInputSchema>
type RefreshDataOutput = z.infer<typeof RefreshDataOutputSchema>

export const refreshDataRegistry: ToolDefinition<
  RefreshDataInput,
  RefreshDataOutput
> = {
  name: 'refresh_data',
  label: 'Refresh Data',
  description: 'Re-scrapes the BFT website and updates Packages, Classes, and BusinessDetails models',
  inputSchema: RefreshDataInputSchema,
  outputSchema: RefreshDataOutputSchema,
  handler: async (input, context) => {
    const { BFT_URL, HAPANA_SITE_ID } = context.env

    if (!BFT_URL) {
      return createToolResponse<RefreshDataOutput>('refresh_data', {
        success: false,
        error: 'BFT_URL environment variable is not set',
      })
    }

    if (!HAPANA_SITE_ID) {
      return createToolResponse<RefreshDataOutput>('refresh_data', {
        success: false,
        error: 'HAPANA_SITE_ID is not set. Please re-install the app.',
      })
    }

    try {
      const result = await scrapeAndSync(BFT_URL, HAPANA_SITE_ID)

      return createToolResponse('refresh_data', {
        success: true,
        data: {
          success: true,
          message: 'Data refreshed successfully',
          packagesCreated: result.packagesCreated,
          packagesUpdated: result.packagesUpdated,
          classesCreated: result.classesCreated,
          classesUpdated: result.classesUpdated,
          businessDetailsUpdated: result.businessDetailsUpdated,
        },
        message: `Refreshed data: ${result.packagesCreated} packages created, ${result.packagesUpdated} packages updated, ${result.classesCreated} classes created, ${result.classesUpdated} classes updated, business details updated`,
      })
    } catch (error) {
      return createToolResponse<RefreshDataOutput>('refresh_data', {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh data',
      })
    }
  },
}
