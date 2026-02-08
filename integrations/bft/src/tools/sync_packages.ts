import { z, type ToolDefinition } from 'skedyul'
import { scrapeAndSync } from '../lib/sync'
import { createToolResponse } from '../lib/response'

const SyncPackagesInputSchema = z.object({})

const SyncPackagesOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  packagesCreated: z.number(),
})

type SyncPackagesInput = z.infer<typeof SyncPackagesInputSchema>
type SyncPackagesOutput = z.infer<typeof SyncPackagesOutputSchema>

export const syncPackagesRegistry: ToolDefinition<
  SyncPackagesInput,
  SyncPackagesOutput
> = {
  name: 'sync_packages',
  label: 'Sync Packages',
  description: 'Re-scrapes the BFT website and updates only the Packages model',
  inputSchema: SyncPackagesInputSchema,
  outputSchema: SyncPackagesOutputSchema,
  handler: async (input, context) => {
    const { BFT_URL, HAPANA_SITE_ID } = context.env

    if (!BFT_URL) {
      return createToolResponse<SyncPackagesOutput>('sync_packages', {
        success: false,
        error: 'BFT_URL environment variable is not set',
      })
    }

    if (!HAPANA_SITE_ID) {
      return createToolResponse<SyncPackagesOutput>('sync_packages', {
        success: false,
        error: 'HAPANA_SITE_ID is not set. Please re-install the app.',
      })
    }

    try {
      const result = await scrapeAndSync(BFT_URL, HAPANA_SITE_ID, {
        syncPackages: true,
        syncClasses: false,
        syncBusinessDetails: false,
      })

      return createToolResponse('sync_packages', {
        success: true,
        data: {
          success: true,
          message: 'Packages synced successfully',
          packagesCreated: result.packagesCreated,
        },
        message: `Synced ${result.packagesCreated} packages`,
      })
    } catch (error) {
      return createToolResponse<SyncPackagesOutput>('sync_packages', {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync packages',
      })
    }
  },
}
