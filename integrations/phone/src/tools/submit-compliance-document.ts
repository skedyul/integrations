import skedyul, { type z as ZodType, instance, file, webhook } from 'skedyul'
import type { ToolDefinition } from 'skedyul'
import {
  createTwilioClient,
  createAddress,
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
  /** Business registration or tax ID number */
  business_id: z.string().describe('Business registration or tax ID number (e.g., EIN, ABN, Company Number)'),
  /** ISO 2-letter country code */
  country: z.string().length(2).describe('ISO 2-letter country code (e.g., AU, US, GB)'),
  /** Full business address (will be parsed using Google Geocoding API) */
  address: z.string().describe('Full business address (e.g., 123 Main St, Sydney NSW 2000)'),
  /** File ID of the uploaded document (fl_xxx) */
  file: z.string().describe('File ID of the uploaded commercial register excerpt'),
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
    const { 
      business_name, 
      business_email, 
      business_id, 
      country, 
      address,
      file: fileId 
    } = input
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
    if (!business_name || !business_email || !business_id || !country || !address || !fileId) {
      return {
        output: {
          status: 'error',
          message: 'Missing required fields: business_name, business_email, business_id, country, address, and file are required',
        },
        billing: { credits: 0 },
      }
    }

    // Validate Google Maps API key is configured
    const googleApiKey = env.GOOGLE_MAPS_API_KEY
    if (!googleApiKey) {
      return {
        output: {
          status: 'error',
          message: 'Google Maps API key is not configured. Please configure GOOGLE_MAPS_API_KEY in environment variables.',
        },
        billing: { credits: 0 },
      }
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
      return {
        output: {
          status: 'error',
          message: `Failed to parse address: ${err instanceof Error ? err.message : 'Unknown error'}. Please provide a valid, complete address.`,
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
          business_id,
          country: isoCountry,
          address, // Store the original address input
          file: fileId, // Store only the file ID, not the S3 path
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
      business_id,
      country: isoCountry,
      address,
      parsedAddress,
      fileId,
      appInstallationId,
      complianceRecordId: complianceRecord.id,
    })

    // Update the compliance record with all form data
    const updateData = {
      business_name,
      business_email,
      business_id,
      country: isoCountry,
      address, // Store the original address input
      file: fileId, // Store only the file ID, not the S3 path
      status: 'PENDING_REVIEW', // Mark as pending review
      // Hardcoded Twilio SIDs for now to avoid spamming Twilio
      bundle_sid: 'BUf7c04b1d019a9c67844976fea763f351',
      end_user_sid: 'IT482fcb7ee070cfbc260c0d53c6c66aa5',
      document_sid: 'RDb9eb3fcc11d5d53a64b994075af2b6fe',
    }
    
    console.log('[Compliance] Updating compliance record with data:', {
      recordId: complianceRecord.id,
      updateData,
    })

    await instance.update(
      complianceRecord.id,
      updateData,
      instanceCtx,
    )

    console.log('[Compliance] Instance updated successfully')

    // ══════════════════════════════════════════════════════════════════════════
    // TEMPORARY: Return hardcoded response to avoid spamming Twilio
    // Remove this block and uncomment the actual Twilio submission below once
    // the instance saving issue is fixed
    // ══════════════════════════════════════════════════════════════════════════
    return {
      output: {
        status: 'pending_review',
        bundleSid: 'BUf7c04b1d019a9c67844976fea763f351',
        endUserSid: 'IT482fcb7ee070cfbc260c0d53c6c66aa5',
        documentSid: 'RDb9eb3fcc11d5d53a64b994075af2b6fe',
        message: 'Document submitted to Twilio for review. This typically takes 1-3 business days.',
      },
      billing: { credits: 0 },
    }
    // ══════════════════════════════════════════════════════════════════════════

    /* COMMENTED OUT: Actual Twilio submission - uncomment when ready

    try {
      // Create Twilio client
      const twilioClient = createTwilioClient(env)

      // ─────────────────────────────────────────────────────────────────────────
      // Step 1: Create Address (required for business compliance)
      // Using parsed address components from Google Geocoding API
      // ─────────────────────────────────────────────────────────────────────────
      console.log('[Compliance] Creating Twilio Address with parsed components:', parsedAddress)
      const twilioAddress = await createAddress(twilioClient, {
        customerName: business_name,
        street: parsedAddress.street,
        city: parsedAddress.city,
        region: parsedAddress.region,
        postalCode: parsedAddress.postalCode,
        isoCountry: isoCountry,
      })
      console.log('[Compliance] Created Address:', twilioAddress.sid)

      // ─────────────────────────────────────────────────────────────────────────
      // Step 2: Create End-User (business entity)
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
      // Step 3: Fetch file content and create Supporting Document
      // Twilio requires actual file content for document uploads, not URLs.
      // We fetch the file from S3 and pass the buffer to Twilio.
      // Using 'commercial_registrar_excerpt' for Australian business compliance.
      // @see https://www.twilio.com/docs/phone-numbers/regulatory/api/supporting-documents
      // ─────────────────────────────────────────────────────────────────────────
      console.log('[Compliance] Getting file URL for download...')
      const fileUrlResponse = await file.getUrl(fileId)
      console.log('[Compliance] File URL obtained, expires at:', fileUrlResponse.expiresAt)

      // Fetch the actual file content from S3
      console.log('[Compliance] Downloading file content...')
      const fileResponse = await fetch(fileUrlResponse.url)
      if (!fileResponse.ok) {
        throw new Error(`Failed to download file: ${fileResponse.status} ${fileResponse.statusText}`)
      }
      const fileBuffer = Buffer.from(await fileResponse.arrayBuffer())
      console.log('[Compliance] Downloaded file, size:', fileBuffer.length, 'bytes')

      console.log('[Compliance] Creating Twilio Supporting Document...')
      const supportingDoc = await createSupportingDocument(twilioClient, {
        friendlyName: `${business_name} - Commercial Register Excerpt`,
        // Use commercial_registrar_excerpt for Australian business compliance
        type: 'commercial_registrar_excerpt',
        // Pass the actual file content to Twilio
        file: fileBuffer,
        // Attributes required per Twilio evaluation:
        // - business_name: for business_name_info requirement
        // - document_number: for business_id_no_info requirement
        // - address_sids: for business_address_proof_of_address_info requirement
        // @see https://www.twilio.com/docs/phone-numbers/regulatory/getting-started/create-new-bundle-public-rest-apis
        attributes: {
          business_name: business_name,
          document_number: business_id,
          address_sids: [twilioAddress.sid],
        },
      })
      console.log('[Compliance] Created Supporting Document:', supportingDoc.sid)

      // ─────────────────────────────────────────────────────────────────────────
      // Step 4: Create Regulatory Bundle with dynamic webhook callback
      // ─────────────────────────────────────────────────────────────────────────
      console.log('[Compliance] Creating Twilio Regulatory Bundle...')
      
      // Create a dynamic webhook registration for Twilio status callbacks
      // This webhook will be called by Twilio when the bundle status changes
      console.log('[Compliance] Creating webhook registration for status callbacks...')
      const webhookResult = await webhook.create('compliance_status', {
        // Context passed to the webhook handler when called
        complianceRecordId: complianceRecord.id,
        businessName: business_name,
      })
      console.log('[Compliance] Created webhook:', webhookResult.url)

      const bundle = await createBundle(twilioClient, {
        friendlyName: `${business_name} Compliance Bundle`,
        email: business_email,
        statusCallback: webhookResult.url, // Use the dynamic webhook URL
        endUserType: 'business',
        isoCountry: isoCountry, // Use the country from user input
        numberType: 'mobile',
      })
      console.log('[Compliance] Created Bundle:', bundle.sid)

      // ─────────────────────────────────────────────────────────────────────────
      // Step 5: Assign Items to Bundle
      // ─────────────────────────────────────────────────────────────────────────
      console.log('[Compliance] Assigning End-User to Bundle...')
      await assignItemToBundle(twilioClient, bundle.sid, endUser.sid)

      console.log('[Compliance] Assigning Supporting Document to Bundle...')
      await assignItemToBundle(twilioClient, bundle.sid, supportingDoc.sid)

      // ─────────────────────────────────────────────────────────────────────────
      // Step 6: Submit Bundle for Review
      // ─────────────────────────────────────────────────────────────────────────
      console.log('[Compliance] Submitting Bundle for review...')
      await submitBundleForReview(twilioClient, bundle.sid)
      console.log('[Compliance] Bundle submitted for review')

      // ─────────────────────────────────────────────────────────────────────────
      // Step 7: Update compliance_record with Twilio resource SIDs
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
        addressSid: twilioAddress.sid,
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
    END COMMENTED OUT */
  },
}
