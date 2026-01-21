import skedyul, { type z as ZodType, instance } from 'skedyul'
import type { ToolDefinition } from 'skedyul'
import {
  createTwilioClient,
  createEndUser,
  createSupportingDocument,
  createBundle,
  assignItemToBundle,
  submitBundleForReview,
} from '../lib/twilio-client'

const { z } = skedyul

/**
 * Input schema for the submit_compliance_document form submit handler.
 * This handler is called when a user submits the compliance form from the modal.
 *
 * Note: Context (appInstallationId, workplace, etc.) is now injected as the second
 * argument by the runtime, not included in the input schema.
 */
const SubmitComplianceDocumentInputSchema = z.object({
  /** Legal business name for Twilio End-User */
  business_name: z.string().describe('Legal name of the business'),
  /** Email for compliance notifications */
  business_email: z.string().email().describe('Email for Twilio compliance notifications'),
  /** S3 file key of the uploaded document */
  file: z.string().describe('S3 file key of the uploaded document'),
})

const SubmitComplianceDocumentOutputSchema = z.object({
  status: z.string().describe('Submission status'),
  bundleSid: z.string().optional().describe('Twilio compliance bundle SID'),
  endUserSid: z.string().optional().describe('Twilio End-User SID'),
  documentSid: z.string().optional().describe('Twilio Supporting Document SID'),
  message: z.string().optional().describe('Status message'),
})

type SubmitComplianceDocumentInput = ZodType.infer<typeof SubmitComplianceDocumentInputSchema>
type SubmitComplianceDocumentOutput = ZodType.infer<typeof SubmitComplianceDocumentOutputSchema>

export const submitComplianceDocumentRegistry: ToolDefinition<
  SubmitComplianceDocumentInput,
  SubmitComplianceDocumentOutput
> = {
  name: 'submit_compliance_document',
  description: 'Submits an uploaded compliance document to Twilio for verification',
  inputs: SubmitComplianceDocumentInputSchema,
  outputSchema: SubmitComplianceDocumentOutputSchema,
  handler: async (input, context) => {
    const { business_name, business_email, file: fileKey } = input
    const { appInstallationId, workplace, env } = context

    // Validate required context fields
    if (!appInstallationId || !workplace) {
      return {
        output: {
          status: 'error',
          message: 'Missing required context: appInstallationId or workplace',
        },
        billing: { credits: 0 },
      }
    }

    // Validate required input fields
    if (!business_name || !business_email || !fileKey) {
      return {
        output: {
          status: 'error',
          message: 'Missing required fields: business_name, business_email, and file are required',
        },
        billing: { credits: 0 },
      }
    }

    // Build the instance context for API calls
    const instanceCtx = {
      appInstallationId,
      workplace,
    }

    // 1. Get or create the compliance record for this installation
    const { data: records } = await instance.list('compliance_record', instanceCtx, {
      page: 1,
      limit: 1,
    })

    let complianceRecord = records[0]
    if (!complianceRecord) {
      // Create a new compliance record when none exists yet
      complianceRecord = await instance.create(
        'compliance_record',
        {
          business_name,
          business_email,
          file: fileKey,
          status: 'PENDING',
        },
        instanceCtx,
      )
    }

    // Check if already submitted and not rejected
    const existingBundleSid = complianceRecord.bundle_sid as string | undefined
    const currentStatus = complianceRecord.status as string | undefined
    
    // Allow resubmission if status is REJECTED - user is trying again with new documents
    const isRejected = currentStatus === 'REJECTED'
    const canResubmit = !existingBundleSid || isRejected
    
    if (!canResubmit) {
      // Already submitted and not rejected - block resubmission
      return {
        output: {
          status: 'already_submitted',
          bundleSid: existingBundleSid,
          message: 'Compliance bundle already submitted. Use "Refresh Status" to check current status.',
        },
        billing: { credits: 0 },
      }
    }
    
    // If resubmitting after rejection, log it
    if (isRejected && existingBundleSid) {
      console.log('[Compliance] Resubmitting after rejection:', {
        previousBundleSid: existingBundleSid,
        previousStatus: currentStatus,
      })
    }

    console.log('[Compliance] Starting Twilio compliance submission:', {
      business_name,
      business_email,
      fileKey,
      appInstallationId,
      complianceRecordId: complianceRecord.id,
    })

    // Update status to SUBMITTED (attempting submission)
    // Clear rejection_reason if resubmitting after rejection
    await instance.update(
      complianceRecord.id,
      {
        business_name,
        business_email,
        file: fileKey,
        status: 'SUBMITTED',
        rejection_reason: null, // Clear previous rejection reason
      },
      instanceCtx,
    )

    try {
      // Create Twilio client
      const twilioClient = createTwilioClient(env)

      // ─────────────────────────────────────────────────────────────────────────
      // Step 1: Create End-User (business entity)
      // ─────────────────────────────────────────────────────────────────────────
      console.log('[Compliance] Creating Twilio End-User...')
      const endUser = await createEndUser(twilioClient, {
        friendlyName: business_name,
        type: 'business',
        attributes: {
          business_name: business_name,
        },
      })
      console.log('[Compliance] Created End-User:', endUser.sid)

      // ─────────────────────────────────────────────────────────────────────────
      // Step 2: Create Supporting Document
      // Note: The actual file is stored in S3. Twilio's Supporting Documents API
      // stores metadata about the document. For full file upload, you may need
      // to use Twilio's document upload endpoint with the actual file bytes.
      // ─────────────────────────────────────────────────────────────────────────
      console.log('[Compliance] Creating Twilio Supporting Document...')
      const supportingDoc = await createSupportingDocument(twilioClient, {
        friendlyName: 'Business Registration',
        type: 'business_registration',
        attributes: {
          // Document metadata - in production, this might include the actual
          // file URL or be uploaded separately via presigned URL
          document_url: fileKey,
        },
      })
      console.log('[Compliance] Created Supporting Document:', supportingDoc.sid)

      // ─────────────────────────────────────────────────────────────────────────
      // Step 3: Create Regulatory Bundle
      // ─────────────────────────────────────────────────────────────────────────
      console.log('[Compliance] Creating Twilio Regulatory Bundle...')
      
      // Note: Status callback URL can be configured in Twilio console or via env variable
      // For webhook-based status updates, configure the compliance_status webhook
      const statusCallbackUrl = env.TWILIO_COMPLIANCE_CALLBACK_URL

      const bundle = await createBundle(twilioClient, {
        friendlyName: `${business_name} Compliance Bundle`,
        email: business_email,
        statusCallback: statusCallbackUrl,
        endUserType: 'business',
        // Note: isoCountry and regulationSid can be configured based on requirements
        // isoCountry: 'US',
        // numberType: 'local',
      })
      console.log('[Compliance] Created Bundle:', bundle.sid)

      // ─────────────────────────────────────────────────────────────────────────
      // Step 4: Assign Items to Bundle
      // ─────────────────────────────────────────────────────────────────────────
      console.log('[Compliance] Assigning End-User to Bundle...')
      await assignItemToBundle(twilioClient, bundle.sid, endUser.sid)

      console.log('[Compliance] Assigning Supporting Document to Bundle...')
      await assignItemToBundle(twilioClient, bundle.sid, supportingDoc.sid)

      // ─────────────────────────────────────────────────────────────────────────
      // Step 5: Submit Bundle for Review
      // ─────────────────────────────────────────────────────────────────────────
      console.log('[Compliance] Submitting Bundle for review...')
      await submitBundleForReview(twilioClient, bundle.sid)
      console.log('[Compliance] Bundle submitted for review')

      // ─────────────────────────────────────────────────────────────────────────
      // Step 6: Update compliance_record with Twilio resource SIDs
      // ─────────────────────────────────────────────────────────────────────────
      await instance.update(
        complianceRecord.id,
        {
          bundle_sid: bundle.sid,
          end_user_sid: endUser.sid,
          document_sid: supportingDoc.sid,
          status: 'PENDING_REVIEW',
        },
        instanceCtx,
      )

      console.log('[Compliance] Compliance submission complete:', {
        bundleSid: bundle.sid,
        endUserSid: endUser.sid,
        documentSid: supportingDoc.sid,
      })

      return {
        output: {
          status: 'pending_review',
          bundleSid: bundle.sid,
          endUserSid: endUser.sid,
          documentSid: supportingDoc.sid,
          message: 'Document submitted to Twilio for review. This typically takes 1-3 business days.',
        },
        billing: {
          credits: 0,
        },
      }
    } catch (err) {
      console.error('[Compliance] Failed to submit to Twilio:', err)

      // Revert status back to PENDING on error
      await instance.update(
        complianceRecord.id,
        {
          status: 'PENDING',
          rejection_reason: err instanceof Error ? err.message : 'Unknown error during submission',
        },
        instanceCtx,
      )

      return {
        output: {
          status: 'error',
          message: `Failed to submit compliance documents: ${err instanceof Error ? err.message : 'Unknown error'}`,
        },
        billing: { credits: 0 },
      }
    }
  },
}
