import type {
  WebhookContext,
  WebhookRequest,
  WebhookResponse,
  WebhookDefinition,
} from 'skedyul'

/**
 * Handle Twilio compliance bundle status callback.
 *
 * TODO: Implement full Twilio compliance status callback handling.
 *
 * When a compliance bundle status changes in Twilio, this webhook is called.
 * The implementation should:
 * 1. Parse the BundleSid and Status from the request body
 * 2. Search for the compliance_record by bundle_sid across all installations
 * 3. Exchange for an installation-scoped token
 * 4. Update the compliance_record status (APPROVED/REJECTED)
 * 5. If approved, optionally trigger phone number provisioning
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
    headers: request.headers,
  })

  // TODO: Implement the following:
  // 1. Parse bundle status from request body
  // const { BundleSid, Status, FailureReason } = parseBody(request.body)
  
  // 2. Search for compliance_record by bundle_sid across all installations
  // const searchResults = await instance.list('compliance_record', undefined, {
  //   filter: { bundle_sid: BundleSid },
  //   limit: 1,
  // })
  
  // 3. Exchange for installation-scoped token
  // const { token: scopedToken } = await tokenClient.exchange(appInstallationId)
  
  // 4. Update the compliance record status
  // const statusMap = {
  //   'twilio-approved': 'APPROVED',
  //   'twilio-rejected': 'REJECTED',
  // }
  // await instance.update(recordId, {
  //   status: statusMap[Status],
  //   rejection_reason: FailureReason || null,
  // }, ctx)
  
  // 5. If approved, optionally trigger phone number provisioning

  return {
    status: 200,
    body: { received: true, message: 'Compliance status webhook received (handler not fully implemented)' },
  }
}

export const complianceStatusRegistry: WebhookDefinition = {
  name: 'compliance_status',
  description: 'Receives compliance bundle status updates from Twilio',
  methods: ['POST'],
  handler: handleComplianceStatusCallback,
}
