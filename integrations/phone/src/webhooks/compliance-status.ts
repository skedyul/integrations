import { instance, type WebhookContext, type WebhookRequest, type WebhookResponse, type WebhookDefinition } from 'skedyul'

/**
 * Twilio compliance bundle status mapping.
 * Maps Twilio status values to our internal status values.
 */
const TWILIO_STATUS_MAP: Record<string, string> = {
  'twilio-approved': 'APPROVED',
  'twilio-rejected': 'REJECTED',
  'pending-review': 'PENDING_REVIEW',
  'draft': 'PENDING',
  'in-review': 'PENDING_REVIEW',
}

/**
 * Parse the Twilio compliance callback body.
 * Twilio sends URL-encoded form data, not JSON.
 */
function parseTwilioCallback(body: unknown): {
  bundleSid: string | null
  status: string | null
  failureReason: string | null
} {
  if (!body || typeof body !== 'object') {
    return { bundleSid: null, status: null, failureReason: null }
  }

  const data = body as Record<string, unknown>
  return {
    bundleSid: (data.BundleSid as string) ?? null,
    status: (data.Status as string) ?? null,
    failureReason: (data.FailureReason as string) ?? null,
  }
}

/**
 * Handle Twilio compliance bundle status callback.
 *
 * This webhook is called by Twilio when a compliance bundle status changes.
 * The platform pre-authenticates the request and injects context via headers:
 * - context.appInstallationId: The installation this webhook belongs to
 * - context.workplace: Workplace info
 * - context.registration: Metadata passed when webhook.create() was called
 *   - complianceRecordId: The ID of the compliance record to update
 *   - businessName: The business name for logging
 *
 * Expected Twilio callback payload:
 * - BundleSid: The SID of the compliance bundle
 * - Status: The new status (twilio-approved, twilio-rejected, etc.)
 * - FailureReason: Reason for rejection (if rejected)
 */
async function handleComplianceStatusCallback(
  request: WebhookRequest,
  context: WebhookContext,
): Promise<WebhookResponse> {
  console.log('[Compliance Webhook] Received status callback:', {
    body: request.body,
    registration: context.registration,
    appInstallationId: context.appInstallationId,
  })

  // Parse Twilio callback data
  const { bundleSid, status, failureReason } = parseTwilioCallback(request.body)

  if (!bundleSid || !status) {
    console.warn('[Compliance Webhook] Missing BundleSid or Status in callback')
    return {
      status: 400,
      body: { error: 'Missing BundleSid or Status' },
    }
  }

  // Get the compliance record ID from the webhook registration context
  // This was passed when webhook.create() was called in submit-compliance-document
  const complianceRecordId = context.registration?.complianceRecordId as string | undefined
  const businessName = context.registration?.businessName as string | undefined

  if (!complianceRecordId) {
    console.warn('[Compliance Webhook] No complianceRecordId in registration context')
    return {
      status: 400,
      body: { error: 'Missing complianceRecordId in webhook context' },
    }
  }

  // Validate we have installation context (platform injects this)
  if (!context.appInstallationId || !context.workplace) {
    console.error('[Compliance Webhook] Missing platform context')
    return {
      status: 500,
      body: { error: 'Missing platform context' },
    }
  }

  // Map Twilio status to our internal status
  const internalStatus = TWILIO_STATUS_MAP[status] ?? status

  console.log('[Compliance Webhook] Updating compliance record:', {
    complianceRecordId,
    bundleSid,
    twilioStatus: status,
    internalStatus,
    failureReason,
    businessName,
  })

  try {
    // Update the compliance record with the new status
    await instance.update(
      'compliance_record',
      complianceRecordId,
      {
        status: internalStatus,
        rejection_reason: failureReason ?? null,
      },
    )

    console.log('[Compliance Webhook] Successfully updated compliance record')

    return {
      status: 200,
      body: {
        received: true,
        complianceRecordId,
        status: internalStatus,
      },
    }
  } catch (err) {
    console.error('[Compliance Webhook] Failed to update compliance record:', err)
    return {
      status: 500,
      body: { error: 'Failed to update compliance record' },
    }
  }
}

export const complianceStatusRegistry: WebhookDefinition = {
  name: 'compliance_status',
  description: 'Receives compliance bundle status updates from Twilio',
  methods: ['POST'],
  handler: handleComplianceStatusCallback,
}
