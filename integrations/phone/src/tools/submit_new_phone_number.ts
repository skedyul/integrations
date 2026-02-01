import skedyul, { type z as ZodType, instance, communicationChannel, webhook, isRuntimeContext } from 'skedyul'
import type { ToolDefinition } from 'skedyul'
import {
  createTwilioClient,
  searchAvailablePhoneNumbers,
  purchasePhoneNumber,
} from '../lib/twilio_client'

const { z } = skedyul

/**
 * Input schema for the submit_new_phone_number form submit handler.
 * This handler is called when a user submits the new phone number form from the modal.
 */
const SubmitNewPhoneNumberInputSchema = z.object({
  /** Instance ID of the compliance record to link the phone number to */
  compliance_record: z.string().describe('Instance ID of the compliance record'),
  /** Friendly name for the phone number */
  name: z.string().optional().describe('Friendly name for the phone number'),
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
  inputSchema: SubmitNewPhoneNumberInputSchema,
  outputSchema: SubmitNewPhoneNumberOutputSchema,
  handler: async (input, context) => {
    // This is a runtime-only tool (form_submit)
    if (!isRuntimeContext(context)) {
      return {
        output: {
          status: 'error',
          message: 'This tool can only be called in a runtime context',
        },
        billing: { credits: 0 },
      }
    }

    const { compliance_record: complianceRecordId, name } = input
    const { appInstallationId, workplace, env } = context

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

    // 1. Fetch the compliance record and validate it's approved
    console.log('[PhoneNumber] Fetching compliance record:', complianceRecordId)
    let complianceRecord: { id: string; status?: string; business_name?: string; bundle_sid?: string; address_sid?: string } | null = null

    try {
      complianceRecord = await instance.get('compliance_record', complianceRecordId)
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
        const listResult = await instance.list('compliance_record', {
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

    // ══════════════════════════════════════════════════════════════════════════
    // TEMPORARY: Hardcoded Twilio response to avoid spamming Twilio API
    // Remove this block and uncomment the actual Twilio calls below when ready
    // ══════════════════════════════════════════════════════════════════════════
    console.log('[PhoneNumber] Using hardcoded Twilio response (test mode)')
    const purchasedNumber = {
      sid: 'PN9a5882f95d0f57b86fea2972c7c6fc01',
      phoneNumber: '+61468092925',
      friendlyName: `Skedyul - ${complianceRecord.business_name ?? 'Test Business'}`,
      capabilities: { voice: true, sms: true, mms: true },
    }
    console.log('[PhoneNumber] Hardcoded purchased number:', JSON.stringify(purchasedNumber, null, 2))

    // Register webhook for receiving SMS and attach to Twilio phone number
    console.log('[PhoneNumber] Registering receive_sms webhook...')
    let smsWebhookUrl: string | null = null
    try {
      const webhookResult = await webhook.create('receive_sms', {
        phoneNumber: purchasedNumber.phoneNumber,
        phoneNumberSid: purchasedNumber.sid,
      })
      smsWebhookUrl = webhookResult.url
      console.log('[PhoneNumber] Webhook registered:', JSON.stringify(webhookResult, null, 2))

      // Update Twilio phone number with the SMS webhook URL
      // Note: Using hardcoded phone number SID - assumes the number exists in Twilio
      console.log('[PhoneNumber] Updating Twilio phone number with SMS webhook URL...')
      const twilioClient = createTwilioClient(env)
      await twilioClient.incomingPhoneNumbers(purchasedNumber.sid).update({
        smsUrl: smsWebhookUrl,
        smsMethod: 'POST',
      })
      console.log('[PhoneNumber] Twilio phone number updated with SMS webhook URL')
    } catch (webhookErr) {
      console.error('[PhoneNumber] Failed to register webhook or update Twilio:', webhookErr)
      // Continue even if webhook registration fails - the phone number was already created
      // The webhook can be configured later via communication channel lifecycle hooks
    }
    // ══════════════════════════════════════════════════════════════════════════

    /* COMMENTED OUT: Actual Twilio API calls - uncomment when ready
    
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

    // Register webhook for receiving SMS and attach to Twilio phone number
    console.log('[PhoneNumber] Registering receive_sms webhook...')
    let smsWebhookUrl: string | null = null
    try {
      const webhookResult = await webhook.create('receive_sms', {
        phoneNumber: purchasedNumber.phoneNumber,
        phoneNumberSid: purchasedNumber.sid,
      })
      smsWebhookUrl = webhookResult.url
      console.log('[PhoneNumber] Webhook registered:', JSON.stringify(webhookResult, null, 2))

      // Update Twilio phone number with the SMS webhook URL
      console.log('[PhoneNumber] Updating Twilio phone number with SMS webhook URL...')
      await twilioClient.incomingPhoneNumbers(purchasedNumber.sid).update({
        smsUrl: smsWebhookUrl,
        smsMethod: 'POST',
      })
      console.log('[PhoneNumber] Twilio phone number updated with SMS webhook URL')
    } catch (webhookErr) {
      console.error('[PhoneNumber] Failed to register webhook or update Twilio:', webhookErr)
      // Continue even if webhook registration fails - the phone number was already created
      // The webhook can be configured later via communication channel lifecycle hooks
    }

    END COMMENTED OUT */

    // 7. Create phone_number instance and link to compliance record
    console.log('[PhoneNumber] Creating phone_number instance...')
    
    // Prepare the data for instance creation
    const phoneNumberData = {
      phone: purchasedNumber.phoneNumber,
      // Include optional friendly name
      name: name ?? undefined,
      // Link to the compliance record via the relationship field
      compliance_record: complianceRecordId,
    }
    
    console.log('[PhoneNumber] Instance data to create:', JSON.stringify(phoneNumberData, null, 2))

    try {
      const phoneNumberInstance = await instance.create(
        'phone_number',
        phoneNumberData,
      )

      console.log('[PhoneNumber] Created phone_number instance result:', JSON.stringify(phoneNumberInstance, null, 2))
      console.log('[PhoneNumber] Instance ID:', phoneNumberInstance?.id)
      console.log('[PhoneNumber] Instance phone field:', (phoneNumberInstance as Record<string, unknown>)?.phone)

      // Verify the instance was created with the correct data
      if (!phoneNumberInstance?.id) {
        console.error('[PhoneNumber] Instance creation returned without ID')
        return {
          output: {
            status: 'error',
            message: 'Failed to create phone number record - no instance ID returned',
          },
          billing: { credits: 0 },
        }
      }

      // 8. Create communication channel (model links are configured separately on the Contacts page)
      console.log('[PhoneNumber] Creating communication channel...')
      try {
        const channel = await communicationChannel.create('phone', {
          name: name ?? `Phone ${purchasedNumber.phoneNumber}`,
          identifierValue: purchasedNumber.phoneNumber,
        })
        console.log('[PhoneNumber] Channel created:', JSON.stringify(channel, null, 2))
      } catch (channelErr) {
        console.error('[PhoneNumber] Failed to create communication channel:', channelErr)
        // Continue even if channel creation fails - the phone number was already created
        // The user can create the channel later in settings
      }

      return {
        output: {
          status: 'success',
          phoneNumber: purchasedNumber.phoneNumber,
          phoneNumberSid: purchasedNumber.sid,
          message: `Successfully purchased phone number ${purchasedNumber.phoneNumber}`,
        },
        billing: { credits: 1 },
        effect: {
          redirect: `/phone-numbers/${phoneNumberInstance.id}/overview`,
        },
      }
    } catch (err) {
      console.error('[PhoneNumber] Failed to create phone_number instance:', err)
      console.error('[PhoneNumber] Error details:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2))

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
