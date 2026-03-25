import skedyul, { type z as ZodType, instance, isRuntimeContext } from 'skedyul'
import type { ToolDefinition } from 'skedyul'
import {
  createTwilioClient,
  fetchBundleStatus,
  mapTwilioStatusToInternal,
  type TwilioBundleStatus,
} from '../lib/twilio_client'

const { z } = skedyul

/**
 * Input schema for the check_compliance_status page action handler.
 * This handler is called when a user clicks the "Refresh Status" button.
 *
 * Note: Context (appInstallationId, workplace, fieldValues, etc.) is now injected
 * as the second argument by the runtime, not included in the input schema.
 */
const CheckComplianceStatusInputSchema = z.object({
  // Page actions may have empty inputs - all context comes from the second argument
})

const CheckComplianceStatusOutputSchema = z.object({
  status: z.string().describe('Current compliance status'),
  twilioStatus: z.string().optional().describe('Raw Twilio bundle status'),
  lastUpdated: z.string().optional().describe('Last update timestamp'),
  message: z.string().optional().describe('Status message'),
  rejectionReason: z.string().optional().describe('Reason for rejection if applicable'),
})

type CheckComplianceStatusInput = ZodType.infer<typeof CheckComplianceStatusInputSchema>
type CheckComplianceStatusOutput = ZodType.infer<typeof CheckComplianceStatusOutputSchema>

/**
 * Status messages for each compliance status.
 */
const STATUS_MESSAGES: Record<string, string> = {
  pending: 'No compliance documents have been submitted yet.',
  submitted: 'Documents are being submitted to Twilio.',
  pending_review: 'Your compliance documents are under review. This typically takes 1-3 business days.',
  approved: 'Your compliance documents have been approved! You can now provision phone numbers.',
  rejected: 'Your compliance documents were rejected. Please review the rejection reason and resubmit.',
}

export const checkComplianceStatusRegistry: ToolDefinition<
  CheckComplianceStatusInput,
  CheckComplianceStatusOutput
> = {
  name: 'check_compliance_status',
  label: 'Check Compliance Status',
  description: 'Checks the current compliance status from Twilio',
  inputSchema: CheckComplianceStatusInputSchema,
  outputSchema: CheckComplianceStatusOutputSchema,
  handler: async (_input, context) => {
    // This is a runtime-only tool (page_action)
    if (!isRuntimeContext(context)) {
      return {
        output: {
          status: 'error',
          message: 'This tool can only be called in a runtime context',
        },
        billing: { credits: 0 },
        meta: {
          success: false,
          message: 'This tool can only be called in a runtime context',
          toolName: 'check_compliance_status',
        },
      }
    }

    const { appInstallationId, workplace, env } = context

    // 1. Get the compliance record for this installation
    const { data: records } = await instance.list('compliance_record', {
      page: 1,
      limit: 1,
    })

    const complianceRecord = records[0]
    if (!complianceRecord) {
      return {
        output: {
          status: 'pending',
          lastUpdated: new Date().toISOString(),
          message: STATUS_MESSAGES.pending,
        },
        billing: { credits: 0 },
        meta: {
          success: true,
          message: 'No compliance record found',
          toolName: 'check_compliance_status',
        },
      }
    }

    const bundleSid = complianceRecord.bundle_sid as string | undefined
    const currentStatus = complianceRecord.status as string

    // If no bundle has been created yet, return current status
    if (!bundleSid) {
      return {
        output: {
          status: currentStatus || 'pending',
          lastUpdated: new Date().toISOString(),
          message: STATUS_MESSAGES[currentStatus] || STATUS_MESSAGES.pending,
        },
        billing: { credits: 0 },
        meta: {
          success: true,
          message: 'Compliance status retrieved',
          toolName: 'check_compliance_status',
        },
      }
    }

    console.log('[Compliance] Checking Twilio bundle status:', {
      bundleSid,
      currentStatus,
      appInstallationId,
    })

    try {
      // Create Twilio client and fetch bundle status
      const twilioClient = createTwilioClient(env)
      const bundle = await fetchBundleStatus(twilioClient, bundleSid)

      const twilioStatus = bundle.status as TwilioBundleStatus
      const newStatus = mapTwilioStatusToInternal(twilioStatus)

      console.log('[Compliance] Twilio bundle status:', {
        bundleSid,
        twilioStatus,
        mappedStatus: newStatus,
        failureReason: bundle.failureReason,
      })

      // Update local record if status changed
      if (newStatus !== currentStatus) {
        console.log('[Compliance] Status changed, updating record:', {
          from: currentStatus,
          to: newStatus,
        })

        await instance.update(
          'compliance_record',
          complianceRecord.id,
          {
            status: newStatus,
            rejection_reason: bundle.failureReason || null,
          },
        )
      }

    return {
      output: {
          status: newStatus,
          twilioStatus,
        lastUpdated: new Date().toISOString(),
          message: STATUS_MESSAGES[newStatus] || `Status: ${newStatus}`,
          rejectionReason: bundle.failureReason || undefined,
        },
        billing: { credits: 0 },
        meta: {
          success: true,
          message: 'Compliance status retrieved from Twilio',
          toolName: 'check_compliance_status',
        },
      }
    } catch (err) {
      console.error('[Compliance] Failed to check Twilio status:', err)

      // Return current local status on error
      return {
        output: {
          status: currentStatus || 'pending',
          lastUpdated: new Date().toISOString(),
          message: `Unable to fetch latest status from Twilio. Current status: ${currentStatus}`,
      },
        billing: { credits: 0 },
        meta: {
          success: false,
          message: 'Failed to fetch status from Twilio',
          toolName: 'check_compliance_status',
        },
      }
    }
  },
}
