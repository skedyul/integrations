import { z, type ToolDefinition } from 'skedyul'
import { scrapeAndSync } from '../lib/sync'
import { createToolResponse } from '../lib/response'

const SyncClassesInputSchema = z.object({})

const SyncClassesOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  classesCreated: z.number(),
  classesUpdated: z.number(),
})

type SyncClassesInput = z.infer<typeof SyncClassesInputSchema>
type SyncClassesOutput = z.infer<typeof SyncClassesOutputSchema>

export const syncClassesRegistry: ToolDefinition<
  SyncClassesInput,
  SyncClassesOutput
> = {
  name: 'sync_classes',
  label: 'Sync Classes',
  description: 'Re-scrapes the BFT website and updates only the Classes model',
  inputSchema: SyncClassesInputSchema,
  outputSchema: SyncClassesOutputSchema,
  timeout: 300000, // 5 minutes - web scraping can take time
  handler: async (input, context) => {
    const { BFT_URL, HAPANA_SITE_ID } = context.env

    if (!BFT_URL) {
      return createToolResponse<SyncClassesOutput>('sync_classes', {
        success: false,
        error: 'BFT_URL environment variable is not set',
      })
    }

    if (!HAPANA_SITE_ID) {
      return createToolResponse<SyncClassesOutput>('sync_classes', {
        success: false,
        error: 'HAPANA_SITE_ID is not set. Please re-install the app.',
      })
    }

    try {
      const result = await scrapeAndSync(BFT_URL, HAPANA_SITE_ID, {
        syncPackages: false,
        syncClasses: true,
        syncBusinessDetails: false,
      })

      return createToolResponse('sync_classes', {
        success: true,
        data: {
          success: true,
          message: 'Classes synced successfully',
          classesCreated: result.classesCreated,
          classesUpdated: result.classesUpdated,
        },
        message: `Synced classes: ${result.classesCreated} created, ${result.classesUpdated} updated`,
      })
    } catch (error) {
      return createToolResponse<SyncClassesOutput>('sync_classes', {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync classes',
      })
    }
  },
}
