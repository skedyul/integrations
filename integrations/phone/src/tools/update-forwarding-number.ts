import skedyul, { type z as ZodType, instance, webhook } from 'skedyul'
import type { ToolDefinition } from 'skedyul'
import { createTwilioClient } from '../lib/twilio-client'

const { z } = skedyul

const UpdateForwardingNumberInputSchema = z.object({
  forwarding_phone_number: z.string().describe('Forwarding phone number to save'),
  phone_id: z.string().optional().describe('Instance ID from path params'),
})

const UpdateForwardingNumberOutputSchema = z.object({
  status: z.string(),
  message: z.string().optional(),
})

type UpdateForwardingNumberInput = ZodType.infer<typeof UpdateForwardingNumberInputSchema>
type UpdateForwardingNumberOutput = ZodType.infer<typeof UpdateForwardingNumberOutputSchema>

export const updateForwardingNumberRegistry: ToolDefinition<
  UpdateForwardingNumberInput,
  UpdateForwardingNumberOutput
> = {
  name: 'update_forwarding_number',
  description: 'Updates the call forwarding number for this phone record and configures Twilio voiceUrl',
  inputs: UpdateForwardingNumberInputSchema,
  outputSchema: UpdateForwardingNumberOutputSchema,
  handler: async (input, context) => {
    const phoneNumberId = input.phone_id || context.params?.phone_id
    const forwardingValue = input.forwarding_phone_number.trim()

    if (!phoneNumberId) {
      return {
        output: {
          status: 'error',
          message: 'Missing phone_id',
        },
        billing: { credits: 0 },
      }
    }

    // 1. Fetch the phone_number instance to get the phone value
    let phoneRecord: { phone?: string } | null = null
    try {
      phoneRecord = await instance.get('phone_number', phoneNumberId) as unknown as { phone?: string } | null
    } catch (error) {
      console.error('[UpdateForwardingNumber] Failed to fetch phone_number instance', error)
      return {
        output: {
          status: 'error',
          message: 'Failed to fetch phone number record',
        },
        billing: { credits: 0 },
      }
    }

    if (!phoneRecord?.phone) {
      return {
        output: {
          status: 'error',
          message: 'Phone number not found',
        },
        billing: { credits: 0 },
      }
    }

    // 2. Update the phone_number model with the forwarding number
    try {
      await instance.update('phone_number', phoneNumberId, {
        forwarding_phone_number: forwardingValue || null,
      })
    } catch (error) {
      console.error('[UpdateForwardingNumber] Failed to save forwarding number', error)
      return {
        output: {
          status: 'error',
          message: `Failed to save forwarding number: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        },
        billing: { credits: 0 },
      }
    }

    // 3. Configure Twilio's voiceUrl
    try {
      const twilioClient = createTwilioClient(context.env)

      // Find the phone number in Twilio
      const phoneNumbers = await twilioClient.incomingPhoneNumbers.list({
        phoneNumber: phoneRecord.phone,
      })

      if (phoneNumbers.length === 0) {
        console.log('[UpdateForwardingNumber] Phone number not found in Twilio:', phoneRecord.phone)
        return {
          output: {
            status: 'partial_success',
            message: 'Forwarding number saved, but phone number not found in Twilio account',
          },
          billing: { credits: 0 },
        }
      }

      const phoneNumberSid = phoneNumbers[0].sid

      if (forwardingValue) {
        // Create/get webhook URL for receive_call
        const { url: voiceUrl } = await webhook.create('receive_call')

        // Configure Twilio to point to our webhook
        await twilioClient.incomingPhoneNumbers(phoneNumberSid).update({
          voiceUrl,
          voiceMethod: 'POST',
        })

        console.log('[UpdateForwardingNumber] Configured Twilio voiceUrl:', voiceUrl)
      } else {
        // Clear the voiceUrl when forwarding number is removed
        await twilioClient.incomingPhoneNumbers(phoneNumberSid).update({
          voiceUrl: '',
          voiceMethod: 'POST',
        })

        console.log('[UpdateForwardingNumber] Cleared Twilio voiceUrl')
      }

      return {
        output: {
          status: 'success',
          message: forwardingValue
            ? 'Forwarding number saved and Twilio configured'
            : 'Forwarding number cleared and Twilio updated',
        },
        billing: { credits: 0 },
      }
    } catch (error) {
      console.error('[UpdateForwardingNumber] Failed to configure Twilio', error)
      // Still return success for the database update
      return {
        output: {
          status: 'partial_success',
          message: `Forwarding number saved, but failed to configure Twilio: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        },
        billing: { credits: 0 },
      }
    }
  },
}
