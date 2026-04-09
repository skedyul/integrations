import { z, type ToolDefinition, createSuccessResponse, createValidationError, createExternalError } from 'skedyul'
import { scrapeAndSync } from '../lib/sync'

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
  config: {
    timeout: 300000,
  },
  handler: async (input, context) => {
    const { BFT_URL, HAPANA_SITE_ID } = context.env

    if (!BFT_URL) {
      return createValidationError('BFT_URL environment variable is not set')
    }

    if (!HAPANA_SITE_ID) {
      return createValidationError('HAPANA_SITE_ID is not set. Please re-install the app.')
    }

    try {
      const result = await scrapeAndSync(BFT_URL, HAPANA_SITE_ID)

      return createSuccessResponse({
        success: true,
        message: 'Data refreshed successfully',
        packagesCreated: result.packagesCreated,
        packagesUpdated: result.packagesUpdated,
        classesCreated: result.classesCreated,
        classesUpdated: result.classesUpdated,
        businessDetailsUpdated: result.businessDetailsUpdated,
      })
    } catch (error) {
      return createExternalError(
        'BFT',
        error instanceof Error ? error.message : 'Failed to refresh data',
      )
    }
  },
}
