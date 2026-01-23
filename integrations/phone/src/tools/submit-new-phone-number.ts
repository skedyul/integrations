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
    let complianceRecord: { id: string; status?: string; business_name?: string; bundle_sid?: string } | null = null

    try {
      complianceRecord = await instance.get('compliance_record', complianceRecordId, instanceCtx)
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
      return {
        output: {
          status: 'error',
          message: 'Compliance record not found',
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

    // 5. Purchase the phone number
    console.log('[PhoneNumber] Purchasing phone number:', selectedNumber.phoneNumber)
    let purchasedNumber: Awaited<ReturnType<typeof purchasePhoneNumber>>

    try {
      const businessName = complianceRecord.business_name ?? 'Skedyul'
      purchasedNumber = await purchasePhoneNumber(twilioClient, {
        phoneNumber: selectedNumber.phoneNumber,
        friendlyName: `Skedyul - ${businessName}`,
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
