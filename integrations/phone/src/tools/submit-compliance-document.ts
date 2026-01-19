import skedyul, { type z as ZodType, instance } from 'skedyul'
import type { ToolDefinition } from 'skedyul'

const { z } = skedyul

/**
 * Input schema for the submit_compliance_document field change handler.
 * This handler is called when a user uploads a compliance document.
 *
 * Note: Context (appInstallationId, workplace, etc.) is now injected as the second
 * argument by the runtime, not included in the input schema.
 */
const SubmitComplianceDocumentInputSchema = z.object({
  value: z.string().describe('S3 file key of the uploaded document'),
  previousValue: z.string().optional().describe('Previous file key if replacing'),
})

const SubmitComplianceDocumentOutputSchema = z.object({
  status: z.string().describe('Submission status'),
  bundleSid: z.string().optional().describe('Twilio compliance bundle SID'),
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
    const { value: fileKey } = input
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

    // Build the instance context for API calls
    const instanceCtx = {
      appInstallationId,
      workplace,
    }

    // 1. Get the compliance record for this installation
    const { data: records } = await instance.list('compliance_record', instanceCtx, {
      page: 1,
      limit: 1,
    })

    const complianceRecord = records[0]
    if (!complianceRecord) {
      return {
        output: {
          status: 'error',
          message: 'No compliance record found for this installation',
        },
        billing: { credits: 0 },
      }
    }

    // 2. TODO: Submit file to Twilio compliance API
    // const twilioResult = await submitToTwilioComplianceAPI({
    //   fileKey,
    //   accountSid: env.TWILIO_ACCOUNT_SID,
    //   authToken: env.TWILIO_AUTH_TOKEN,
    // })

    // Placeholder for Twilio API response
    const bundleSid = `BU${Date.now()}`

    console.log('Submitting compliance document:', {
      fileKey,
      appInstallationId,
      complianceRecordId: complianceRecord.id,
    })

    // 3. Update the compliance record with Twilio bundle info
    await instance.update(
      complianceRecord.id,
      {
        document_url: fileKey,
        bundle_sid: bundleSid,
        status: 'submitted',
      },
      instanceCtx,
    )

    return {
      output: {
        status: 'submitted',
        bundleSid,
        message: 'Document submitted successfully. Review pending.',
      },
      billing: {
        credits: 0,
      },
    }
  },
}
