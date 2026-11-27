import skedyul, { type z as ZodType, instance, isRuntimeContext } from 'skedyul'
import type { ToolDefinition } from 'skedyul'
import { reportCompliance, reportPhoneNumber } from '../lib/channel_setup'
import { createSuccessResponse, createValidationError } from '../lib/response'

const { z } = skedyul

const SyncChannelSetupInputSchema = z.object({})

const SyncChannelSetupOutputSchema = z.object({
  status: z.string(),
  compliance: z.string().optional(),
  numbers: z.number(),
})

type SyncChannelSetupInput = ZodType.infer<typeof SyncChannelSetupInputSchema>
type SyncChannelSetupOutput = ZodType.infer<typeof SyncChannelSetupOutputSchema>

const PAGE_SIZE = 100

/**
 * Reports this installation's compliance record and every phone number to
 * Settings → Communication. The platform runs it (the channel's
 * `management.sync`) when that page opens, so records from before the page
 * existed, or changed outside our tools, are shown.
 */
export const syncChannelSetupRegistry: ToolDefinition<SyncChannelSetupInput, SyncChannelSetupOutput> = {
  name: 'sync_channel_setup',
  label: 'Sync Communication settings',
  description:
    "Reports compliance and each phone number's call settings to Settings → Communication.",
  inputSchema: SyncChannelSetupInputSchema,
  outputSchema: SyncChannelSetupOutputSchema,
  handler: async (_input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    const { data: records } = await instance.list('compliance_record', { page: 1, limit: 1 })
    const compliance = records[0] as Record<string, string | null> | undefined
    // No record yet: report not started, so a stale state can't linger.
    await reportCompliance(compliance ?? { status: null })

    let numbers = 0
    for (let page = 1; ; page += 1) {
      const result = await instance.list('phone_number', { page, limit: PAGE_SIZE })
      for (const record of result.data) {
        await reportPhoneNumber(record as Parameters<typeof reportPhoneNumber>[0])
        numbers += 1
      }
      if (!result.pagination?.hasMore || result.data.length === 0) break
    }

    return createSuccessResponse({
      status: 'success',
      compliance: (compliance?.status as string | undefined) ?? 'not_started',
      numbers,
    })
  },
}
