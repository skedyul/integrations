import skedyul, { type z as ZodType, instance, file, webhook, isRuntimeContext } from 'skedyul'
import type { ToolDefinition } from 'skedyul'
import {
  createTwilioClient,
  createAddress,
  createEndUser,
  createSupportingDocument,
  createBundle,
  assignItemToBundle,
  evaluateBundle,
  fetchBundleStatus,
  submitBundleForReview,
} from '../lib/twilio_client'
import {
  ADDRESS_PROOF_DOCUMENT_TYPES,
  submitComplianceToTwilio,
} from '../lib/compliance_submission'
import testData from '../test-data.json'
import { isMockComplianceAndNumberEnabled } from '../lib/mock_compliance'
import {
  createSuccessResponse,
  createValidationError,
  createAuthError,
  createPhoneError,
} from '../lib/response'

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
  /** Business registration or tax ID number */
  business_id: z.string().describe('Business registration or tax ID number (e.g., EIN, ABN, Company Number)'),
  /** ISO 2-letter country code */
  country: z.string().length(2).describe('ISO 2-letter country code (e.g., AU, US, GB)'),
  /** Full business address (will be parsed using Google Geocoding API) */
  address: z.string().describe('Full business address (e.g., 123 Main St, Sydney NSW 2000)'),
  /** File ID of the uploaded commercial register excerpt (fl_xxx) */
  file: z.string().describe('File ID of the uploaded commercial register excerpt'),
  /** Twilio supporting-document type for the proof of address */
  address_proof_type: z.enum(ADDRESS_PROOF_DOCUMENT_TYPES).describe(
    'Proof of address type: utility bill, tax notice, rent receipt, or title deed',
  ),
  /** File ID of the uploaded proof of address (fl_xxx) */
  address_proof: z.string().describe('File ID of the uploaded proof of address'),
})

/**
 * Parse an address using Google Geocoding API to extract components.
 */
type ParsedAddress = {
  street: string
  city: string
  region: string
  postalCode: string
  country: string
}

async function parseAddressWithGoogle(
  address: string,
  apiKey: string,
): Promise<ParsedAddress> {
  const encodedAddress = encodeURIComponent(address)
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Google Geocoding API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json() as {
    status: string
    results: Array<{
      address_components: Array<{
        long_name: string
        short_name: string
        types: string[]
      }>
      formatted_address: string
    }>
    error_message?: string
  }

  if (data.status !== 'OK' || !data.results?.[0]) {
    throw new Error(`Failed to geocode address: ${data.status}${data.error_message ? ` - ${data.error_message}` : ''}`)
  }

  const components = data.results[0].address_components
  
  // Extract address components by type
  const getComponent = (types: string[]): string => {
    const component = components.find((c) => 
      types.some((t) => c.types.includes(t))
    )
    return component?.long_name || ''
  }

  const getShortComponent = (types: string[]): string => {
    const component = components.find((c) => 
      types.some((t) => c.types.includes(t))
    )
    return component?.short_name || ''
  }

  // Build street address from street number and route
  const streetNumber = getComponent(['street_number'])
  const route = getComponent(['route'])
  const street = streetNumber && route ? `${streetNumber} ${route}` : route || streetNumber

  // Get other components
  const city = getComponent(['locality', 'sublocality', 'postal_town'])
  const region = getShortComponent(['administrative_area_level_1']) // e.g., NSW, VIC
  const postalCode = getComponent(['postal_code'])
  const country = getShortComponent(['country']) // e.g., AU

  // Validate we got the minimum required fields
  if (!street) {
    throw new Error('Could not parse street address from the provided address')
  }
  if (!city) {
    throw new Error('Could not parse city from the provided address')
  }
  if (!postalCode) {
    throw new Error('Could not parse postal code from the provided address')
  }

  return {
    street,
    city,
    region: region || city, // Fallback to city if no region
    postalCode,
    country: country || 'AU', // Default to AU if not found
  }
}

async function downloadComplianceFile(fileId: string): Promise<{
  buffer: Buffer
  filename?: string
}> {
  const fileInfo = await file.get(fileId).catch((err: unknown) => {
    console.warn('[Compliance] Could not read file metadata:', err)
    return null
  })
  const fileUrlResponse = await file.getUrl(fileId)
  const fileResponse = await fetch(fileUrlResponse.url)
  if (!fileResponse.ok) {
    throw new Error(`Failed to download file: ${fileResponse.status} ${fileResponse.statusText}`)
  }
  return {
    buffer: Buffer.from(await fileResponse.arrayBuffer()),
    filename: fileInfo?.name,
  }
}

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
  label: 'Submit Compliance Document',
  ui: {
    title: 'Submitted compliance document',
    activeTitle: 'Submitting compliance document',
    targetArg: 'business_name',
  },
  description: 'Submits an uploaded compliance document to Twilio for verification',
  inputSchema: SubmitComplianceDocumentInputSchema,
  outputSchema: SubmitComplianceDocumentOutputSchema,
  handler: async (input, context) => {
    // This is a runtime-only tool (form_submit)
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    const { 
      business_name, 
      business_email, 
      business_id, 
      country, 
      address,
      file: fileId,
      address_proof: addressProofFileId,
      address_proof_type: addressProofType,
    } = input
    const { appInstallationId, workplace, env } = context

    // Validate required input fields
    if (
      !business_name ||
      !business_email ||
      !business_id ||
      !country ||
      !address ||
      !fileId ||
      !addressProofFileId ||
      !addressProofType
    ) {
      return createValidationError(
        'Missing required fields: business_name, business_email, business_id, country, address, file, address_proof_type, and address_proof are required',
      )
    }

    // Validate Google Maps API key is configured
    const googleApiKey = env.GOOGLE_MAPS_API_KEY
    if (!googleApiKey) {
      return createAuthError(
        'Google Maps API key is not configured. Please configure GOOGLE_MAPS_API_KEY in environment variables.',
      )
    }

    // Normalize country to uppercase ISO code
    const isoCountry = country.toUpperCase()

    // Parse address using Google Geocoding API
    let parsedAddress: ParsedAddress
    try {
      console.log('[Compliance] Parsing address with Google Geocoding API:', address)
      parsedAddress = await parseAddressWithGoogle(address, googleApiKey)
      console.log('[Compliance] Parsed address:', parsedAddress)
    } catch (err) {
      console.error('[Compliance] Failed to parse address:', err)
      return createValidationError(
        `Failed to parse address: ${err instanceof Error ? err.message : 'Unknown error'}. Please provide a valid, complete address.`,
      )
    }

    // 1. Get or create the compliance record for this installation
    const { data: records } = await instance.list('compliance_record', {
      page: 1,
      limit: 1,
    })

    console.log('[Compliance] Found existing records:', JSON.stringify(records, null, 2))

    let complianceRecord = records[0]
    if (!complianceRecord) {
      // Create a new compliance record when none exists yet
      console.log('[Compliance] Creating new compliance record with data:', {
        business_name,
        business_email,
        business_id,
        country: isoCountry,
        address,
        file: fileId,
        address_proof: addressProofFileId,
        address_proof_type: addressProofType,
      })
      complianceRecord = await instance.create(
        'compliance_record',
        {
          business_name,
          business_email,
          business_id,
          country: isoCountry,
          address, // Store the original address input
          file: fileId, // Store only the file ID, not the S3 path
          address_proof: addressProofFileId,
          address_proof_type: addressProofType,
          status: 'pending',
        },
      )
      console.log('[Compliance] Created new record:', JSON.stringify(complianceRecord, null, 2))
    } else {
      console.log('[Compliance] Using existing record:', complianceRecord.id)
      console.log('[Compliance] Existing record fields:', Object.keys(complianceRecord))
    }

    // In-review and approved bundles stay as they are. Rejected bundles and
    // drafts left behind by a failed evaluation are updated in place.
    const existingBundleSid = complianceRecord.bundle_sid as string | undefined
    const existingEndUserSid = complianceRecord.end_user_sid as string | undefined
    const currentStatus = complianceRecord.status as string | undefined
    const awaitingReview =
      currentStatus === 'pending_review' ||
      currentStatus === 'submitted' ||
      currentStatus === 'approved'

    if (existingBundleSid && awaitingReview) {
      return createSuccessResponse({
        status: 'already_submitted',
        bundleSid: existingBundleSid,
        message: 'Compliance bundle already submitted. Use "Refresh Status" to check current status.',
      })
    }

    if (currentStatus === 'rejected' && existingBundleSid) {
      console.log('[Compliance] Resubmitting after rejection:', {
        previousBundleSid: existingBundleSid,
        previousStatus: currentStatus,
      })
    }

    console.log('[Compliance] Starting Twilio compliance submission:', {
      business_name,
      business_email,
      business_id,
      country: isoCountry,
      address,
      parsedAddress,
      fileId,
      appInstallationId,
      complianceRecordId: complianceRecord.id,
    })

    // Update the compliance record with all form data
    // Check if test mode is enabled
    const isTestMode = isMockComplianceAndNumberEnabled(env)

    if (isTestMode) {
      // ══════════════════════════════════════════════════════════════════════════
      // TEST MODE: Use hardcoded test data instead of real Twilio API calls
      // ══════════════════════════════════════════════════════════════════════════
      console.log('[Compliance] Test mode enabled - using hardcoded test data')

      const updateData = {
        business_name,
        business_email,
        business_id,
        country: isoCountry,
        address,
        file: fileId,
        address_proof: addressProofFileId,
        address_proof_type: addressProofType,
        status: 'pending_review',
        rejection_reason: '',
        bundle_sid: testData.compliance.bundleSid,
        end_user_sid: testData.compliance.endUserSid,
        document_sid: testData.compliance.documentSid,
        address_document_sid: testData.compliance.addressDocumentSid,
        address_sid: testData.compliance.addressSid,
      }

      console.log('[Compliance] Updating compliance record with test data:', {
        recordId: complianceRecord.id,
        updateData,
      })

      try {
        const updatedInstance = await instance.update(
          'compliance_record',
          complianceRecord.id,
          updateData,
        )
        console.log('[Compliance] Instance updated successfully:', JSON.stringify(updatedInstance, null, 2))
      } catch (updateError) {
        console.error('[Compliance] Failed to update instance:', updateError)
      }

      return createSuccessResponse({
        status: 'pending_review',
        bundleSid: testData.compliance.bundleSid,
        endUserSid: testData.compliance.endUserSid,
        documentSid: testData.compliance.documentSid,
        message: 'Document submitted to Twilio for review. This typically takes 1-3 business days.',
      })
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PRODUCTION MODE: Real Twilio API calls
    // ══════════════════════════════════════════════════════════════════════════
    console.log('[Compliance] Production mode - submitting to Twilio')

    try {
      const twilioClient = createTwilioClient(env)
      const uploadAuth = {
        username: env.TWILIO_ACCOUNT_SID,
        password: env.TWILIO_AUTH_TOKEN,
      }

      console.log('[Compliance] Downloading registration and address proof...')
      const registrationFile = await downloadComplianceFile(fileId)
      const addressProofFile = await downloadComplianceFile(addressProofFileId)
      console.log('[Compliance] Downloaded files:', {
        registrationBytes: registrationFile.buffer.length,
        addressProofBytes: addressProofFile.buffer.length,
      })

      const outcome = await submitComplianceToTwilio(
        {
          existingBundleSid,
          existingEndUserSid,
          businessName: business_name,
          businessEmail: business_email,
          businessId: business_id,
          isoCountry,
          address: {
            customerName: business_name,
            street: parsedAddress.street,
            city: parsedAddress.city,
            region: parsedAddress.region,
            postalCode: parsedAddress.postalCode,
            isoCountry,
          },
          proof: {
            file: registrationFile.buffer,
            filename: registrationFile.filename,
          },
          addressProof: {
            file: addressProofFile.buffer,
            filename: addressProofFile.filename,
            type: addressProofType,
          },
          friendlyBundleName: `${business_name} Compliance Bundle`,
          createStatusCallback: async () => {
            console.log('[Compliance] Creating webhook registration for status callbacks...')
            const webhookResult = await webhook.create('compliance_status', {
              complianceRecordId: complianceRecord.id,
              businessName: business_name,
            })
            console.log('[Compliance] Created webhook:', webhookResult.url)
            return webhookResult.url
          },
        },
        {
          fetchBundleStatus: async (bundleSid) => {
            const bundle = await fetchBundleStatus(twilioClient, bundleSid)
            return { status: bundle.status }
          },
          createAddress: (address) => createAddress(twilioClient, address),
          createEndUser: (params) =>
            createEndUser(twilioClient, {
              friendlyName: params.friendlyName,
              type: 'business',
              attributes: { business_name: params.businessName },
            }),
          createSupportingDocument: (params) =>
            createSupportingDocument(
              twilioClient,
              {
                friendlyName: params.friendlyName,
                type: params.type,
                file: params.file,
                filename: params.filename,
                mimeType: params.mimeType,
                attributes: params.attributes,
              },
              uploadAuth,
            ),
          createBundle: (params) =>
            createBundle(twilioClient, {
              friendlyName: params.friendlyName,
              email: params.email,
              statusCallback: params.statusCallback,
              endUserType: 'business',
              isoCountry: params.isoCountry,
              numberType: 'mobile',
            }),
          assignItem: async (bundleSid, objectSid) => {
            await assignItemToBundle(twilioClient, bundleSid, objectSid)
          },
          evaluateBundle: (bundleSid) => evaluateBundle(twilioClient, bundleSid),
          submitBundleForReview: async (bundleSid) => {
            await submitBundleForReview(twilioClient, bundleSid)
          },
        },
      )

      if (outcome.kind === 'blocked') {
        return createSuccessResponse({
          status: 'already_submitted',
          bundleSid: outcome.bundleSid,
          message: `Compliance bundle is ${outcome.twilioStatus} and cannot be resubmitted.`,
        })
      }

      if (outcome.kind === 'not_compliant') {
        const reason = outcome.failureReasons.join(' ')
        console.log('[Compliance] Bundle failed evaluation:', {
          bundleSid: outcome.bundleSid,
          reason,
        })
        await instance.update('compliance_record', complianceRecord.id, {
          bundle_sid: outcome.bundleSid,
          end_user_sid: outcome.endUserSid,
          document_sid: outcome.documentSid,
          address_document_sid: outcome.addressDocumentSid,
          address_sid: outcome.addressSid,
          file: fileId,
          address_proof: addressProofFileId,
          address_proof_type: addressProofType,
          status: 'pending',
          rejection_reason: reason,
        })
        return createPhoneError(
          `Compliance documents were not submitted. ${reason}`,
        )
      }

      await instance.update('compliance_record', complianceRecord.id, {
        bundle_sid: outcome.bundleSid,
        end_user_sid: outcome.endUserSid,
        document_sid: outcome.documentSid,
        address_document_sid: outcome.addressDocumentSid,
        address_sid: outcome.addressSid,
        file: fileId,
        address_proof: addressProofFileId,
        address_proof_type: addressProofType,
        status: 'pending_review',
        rejection_reason: '',
      })

      console.log('[Compliance] Compliance submission complete:', {
        addressSid: outcome.addressSid,
        bundleSid: outcome.bundleSid,
        endUserSid: outcome.endUserSid,
        documentSid: outcome.documentSid,
        addressDocumentSid: outcome.addressDocumentSid,
        reusedBundle: outcome.reusedBundle,
      })

      return createSuccessResponse({
        status: 'pending_review',
        bundleSid: outcome.bundleSid,
        endUserSid: outcome.endUserSid,
        documentSid: outcome.documentSid,
        message: 'Document submitted to Twilio for review. This typically takes 1-3 business days.',
      })
    } catch (err) {
      console.error('[Compliance] Failed to submit to Twilio:', err)

      // Revert status back to pending on error
      await instance.update(
        'compliance_record',
        complianceRecord.id,
        {
          status: 'pending',
          rejection_reason: err instanceof Error ? err.message : 'Unknown error during submission',
        },
      )

      return createPhoneError(
        `Failed to submit compliance documents: ${err instanceof Error ? err.message : 'Unknown error'}`,
      )
    }
  },
}
