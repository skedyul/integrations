import skedyul, { type z as ZodType, instance } from 'skedyul'
import type { ToolDefinition } from 'skedyul'
import {
  createTwilioClient,
  searchAvailablePhoneNumbers,
  purchasePhoneNumber,
} from '../lib/twilio-client'

const { z } = skedyul

/**
 * Input schema for the submit_new_phone_number form submit handler.
 * This handler is called when a user submits the new phone number form from the modal.
 */
const SubmitNewPhoneNumberInputSchema = z.object({
  /** Instance ID of the compliance record to link the phone number to */
  compliance_record: z.string().describe('Instance ID of the compliance record'),
})

const SubmitNewPhoneNumberOutputSchema = z.object({
  status: z.string().describe('Submission status'),
  phoneNumber: z.string().optional().describe('The purchased phone number in E.164 format'),
  phoneNumberSid: z.string().optional().describe('Twilio phone number SID'),
  message: z.string().optional().describe('Status message'),
})

type SubmitNewPhoneNumberInput = ZodType.infer<typeof SubmitNewPhoneNumberInputSchema>
type SubmitNewPhoneNumberOutput = ZodType.infer<typeof SubmitNewPhoneNumberOutputSchema>

export const submitNewPhoneNumberRegistry: ToolDefinition<
  SubmitNewPhoneNumberInput,
  SubmitNewPhoneNumberOutput
> = {
  name: 'submit_new_phone_number',
  description: 'Searches for and purchases an Australian mobile phone number from Twilio',
  inputs: SubmitNewPhoneNumberInputSchema,
  outputSchema: SubmitNewPhoneNumberOutputSchema,
  handler: async (input, context) => {
    const { compliance_record: complianceRecordId } = input
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

    // Validate compliance record ID is provided
    if (!complianceRecordId) {
      return {
        output: {
          status: 'error',
          message: 'Missing required field: compliance_record',
        },
        billing: { credits: 0 },
      }
    }

    // Build the instance context for API calls
    const instanceCtx = {
      appInstallationId,
      workplace,
    }

    // 1. Fetch the compliance record and validate it's approved
    console.log('[PhoneNumber] Fetching compliance record:', complianceRecordId)
    console.log('[PhoneNumber] Instance context:', JSON.stringify(instanceCtx, null, 2))
    let complianceRecord: { id: string; status?: string; business_name?: string; bundle_sid?: string; address_sid?: string } | null = null

    try {
      // instance.get takes (id, ctx) - no model handle needed since IDs are globally unique
      complianceRecord = await instance.get(complianceRecordId, instanceCtx)
      console.log('[PhoneNumber] instance.get result:', JSON.stringify(complianceRecord, null, 2))
    } catch (err) {
      console.error('[PhoneNumber] Failed to fetch compliance record:', err)
      return {
        output: {
          status: 'error',
          message: `Failed to fetch compliance record: ${err instanceof Error ? err.message : 'Unknown error'}`,
        },
        billing: { credits: 0 },
      }
    }

    if (!complianceRecord) {
      // Fallback: Try to find the record by listing and filtering by ID
      // This helps diagnose if the issue is mismatched appInstallationId
      console.log('[PhoneNumber] Direct get returned null, trying list with filter...')
      try {
        const listResult = await instance.list('compliance_record', instanceCtx, {
          filter: { id: complianceRecordId },
          limit: 1,
        })
        console.log('[PhoneNumber] List result:', JSON.stringify(listResult, null, 2))
        
        if (listResult.data.length > 0) {
          complianceRecord = listResult.data[0] as unknown as NonNullable<typeof complianceRecord>
          console.log('[PhoneNumber] Found via list:', JSON.stringify(complianceRecord, null, 2))
        }
      } catch (listErr) {
        console.error('[PhoneNumber] List fallback also failed:', listErr)
      }
    }

    if (!complianceRecord) {
      return {
        output: {
          status: 'error',
          message: `Compliance record not found. Searched for id=${complianceRecordId} with appInstallationId=${appInstallationId}. The record may belong to a different installation.`,
        },
        billing: { credits: 0 },
      }
    }

    console.log('[PhoneNumber] Compliance record:', JSON.stringify(complianceRecord, null, 2))

    // 2. Validate compliance record is approved
    if (complianceRecord.status !== 'APPROVED') {
      return {
        output: {
          status: 'error',
          message: `Compliance record is not approved. Current status: ${complianceRecord.status ?? 'PENDING'}. Please wait for Twilio to approve your compliance documents before purchasing a phone number.`,
        },
        billing: { credits: 0 },
      }
    }

    // 3. Create Twilio client
    let twilioClient: ReturnType<typeof createTwilioClient>
    try {
      twilioClient = createTwilioClient(env)
    } catch (err) {
      console.error('[PhoneNumber] Failed to create Twilio client:', err)
      return {
        output: {
          status: 'error',
          message: `Failed to initialize Twilio client: ${err instanceof Error ? err.message : 'Unknown error'}`,
        },
        billing: { credits: 0 },
      }
    }

    // 4. Search for available AU mobile numbers with Voice, SMS, and MMS capabilities
    console.log('[PhoneNumber] Searching for available AU mobile numbers...')
    let availableNumbers: Awaited<ReturnType<typeof searchAvailablePhoneNumbers>>

    try {
      availableNumbers = await searchAvailablePhoneNumbers(twilioClient, {
        countryCode: 'AU',
        numberType: 'mobile',
        smsEnabled: true,
        voiceEnabled: true,
        mmsEnabled: true,
        limit: 1,
      })
    } catch (err) {
      console.error('[PhoneNumber] Failed to search available numbers:', err)
      return {
        output: {
          status: 'error',
          message: `Failed to search for available phone numbers: ${err instanceof Error ? err.message : 'Unknown error'}`,
        },
        billing: { credits: 0 },
      }
    }

    if (availableNumbers.length === 0) {
      return {
        output: {
          status: 'error',
          message: 'No available Australian mobile phone numbers found with the required capabilities (Voice, SMS, MMS). Please try again later.',
        },
        billing: { credits: 0 },
      }
    }

    const selectedNumber = availableNumbers[0]
    console.log('[PhoneNumber] Found available number:', selectedNumber.phoneNumber)

    // 5. Validate we have the required Twilio SIDs for AU phone numbers
    const bundleSid = complianceRecord.bundle_sid
    const addressSid = complianceRecord.address_sid

    if (!bundleSid) {
      return {
        output: {
          status: 'error',
          message: 'Compliance record is missing bundle_sid. Please resubmit your compliance documents.',
        },
        billing: { credits: 0 },
      }
    }

    if (!addressSid) {
      return {
        output: {
          status: 'error',
          message: 'Compliance record is missing address_sid. Please resubmit your compliance documents.',
        },
        billing: { credits: 0 },
      }
    }

    // 6. Purchase the phone number with compliance bundle and address
    console.log('[PhoneNumber] Purchasing phone number:', selectedNumber.phoneNumber)
    console.log('[PhoneNumber] Using bundleSid:', bundleSid)
    console.log('[PhoneNumber] Using addressSid:', addressSid)
    let purchasedNumber: Awaited<ReturnType<typeof purchasePhoneNumber>>

    try {
      const businessName = complianceRecord.business_name ?? 'Skedyul'
      purchasedNumber = await purchasePhoneNumber(twilioClient, {
        phoneNumber: selectedNumber.phoneNumber,
        friendlyName: `Skedyul - ${businessName}`,
        // Required for AU and other regulated countries
        bundleSid,
        addressSid,
      })
    } catch (err) {
      console.error('[PhoneNumber] Failed to purchase phone number:', err)
      return {
        output: {
          status: 'error',
          message: `Failed to purchase phone number: ${err instanceof Error ? err.message : 'Unknown error'}`,
        },
        billing: { credits: 0 },
      }
    }

    console.log('[PhoneNumber] Purchased number:', JSON.stringify(purchasedNumber, null, 2))

    // 6. Create phone_number instance and link to compliance record
    console.log('[PhoneNumber] Creating phone_number instance...')

    try {
      const phoneNumberInstance = await instance.create(
        'phone_number',
        {
          phone: purchasedNumber.phoneNumber,
          // Link to the compliance record via the relationship field
          compliance_record: complianceRecordId,
        },
        instanceCtx,
      )

      console.log('[PhoneNumber] Created phone_number instance:', JSON.stringify(phoneNumberInstance, null, 2))

      return {
        output: {
          status: 'success',
          phoneNumber: purchasedNumber.phoneNumber,
          phoneNumberSid: purchasedNumber.sid,
          message: `Successfully purchased phone number ${purchasedNumber.phoneNumber}`,
        },
        billing: { credits: 1 },
      }
    } catch (err) {
      console.error('[PhoneNumber] Failed to create phone_number instance:', err)

      // Note: The phone number was already purchased from Twilio.
      // In a production system, you might want to release it or retry the database operation.
      return {
        output: {
          status: 'partial_error',
          phoneNumber: purchasedNumber.phoneNumber,
          phoneNumberSid: purchasedNumber.sid,
          message: `Phone number purchased but failed to save to database: ${err instanceof Error ? err.message : 'Unknown error'}. Please contact support with phone number SID: ${purchasedNumber.sid}`,
        },
        billing: { credits: 1 },
      }
    }
  },
}
