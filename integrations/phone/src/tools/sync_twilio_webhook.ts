import skedyul, { type z as ZodType, communicationChannel, webhook, isRuntimeContext } from 'skedyul'
import type { ToolDefinition } from 'skedyul'
import twilio from 'twilio'
import {
  createSuccessResponse,
  createValidationError,
  createAuthError,
  createNotFoundError,
  createPhoneError,
} from '../lib/response'

const { z } = skedyul

/**
 * Input schema for the sync_twilio_webhook tool.
 * This tool syncs the SMS webhook URL to Twilio for a given phone number.
 */
const SyncTwilioWebhookInputSchema = z.object({
  /** Phone number in E.164 format (e.g., +61412345678) */
  phone_number: z.string().describe('Phone number in E.164 format to sync webhook for'),
})

const SyncTwilioWebhookOutputSchema = z.object({
  status: z.string().describe('Sync status'),
  message: z.string().optional().describe('Status message'),
  phone_number: z.string().optional().describe('Phone number that was synced'),
  webhook_url: z.string().optional().describe('Webhook URL that was configured'),
  phone_number_sid: z.string().optional().describe('Twilio phone number SID'),
})

type SyncTwilioWebhookInput = ZodType.infer<typeof SyncTwilioWebhookInputSchema>
type SyncTwilioWebhookOutput = ZodType.infer<typeof SyncTwilioWebhookOutputSchema>

export const syncTwilioWebhookRegistry: ToolDefinition<
  SyncTwilioWebhookInput,
  SyncTwilioWebhookOutput
> = {
  name: 'sync_twilio_webhook',
  label: 'Sync Twilio Webhook',
  description: 'Syncs the SMS webhook URL to Twilio for a given phone number. Updates the Twilio phone number configuration to point to the correct receive_sms webhook endpoint.',
  inputSchema: SyncTwilioWebhookInputSchema,
  outputSchema: SyncTwilioWebhookOutputSchema,
  handler: async (input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    const { phone_number } = input

    if (!phone_number) {
      return createValidationError('Missing required field: phone_number')
    }

    console.log('[SyncTwilioWebhook] Syncing webhook for phone number:', phone_number)

    const accountSid = context.env.TWILIO_ACCOUNT_SID
    const authToken = context.env.TWILIO_AUTH_TOKEN

    if (!accountSid || !authToken) {
      return createAuthError('Missing Twilio credentials (TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN)')
    }

    // Get or create the receive_sms webhook URL
    let webhookUrl: string
    try {
      const listResult = await webhook.list({ name: 'receive_sms' })
      const existingWebhooks = listResult.webhooks

      if (existingWebhooks.length > 0) {
        webhookUrl = existingWebhooks[0].url
        console.log('[SyncTwilioWebhook] Using existing webhook:', webhookUrl)
      } else {
        const webhookResult = await webhook.create('receive_sms', {
          phoneNumber: phone_number,
        })
        webhookUrl = webhookResult.url
        console.log('[SyncTwilioWebhook] Created new webhook:', webhookUrl)
      }
    } catch (err) {
      console.error('[SyncTwilioWebhook] Failed to get/create webhook:', err)
      return createPhoneError(
        `Failed to get/create webhook: ${err instanceof Error ? err.message : 'Unknown error'}`,
      )
    }

    // Initialize Twilio client
    const twilioClient = twilio(accountSid, authToken)

    // Find the phone number in Twilio
    let phoneNumbers
    try {
      phoneNumbers = await twilioClient.incomingPhoneNumbers.list({
        phoneNumber: phone_number,
      })
    } catch (err) {
      console.error('[SyncTwilioWebhook] Failed to list Twilio phone numbers:', err)
      return createPhoneError(
        `Failed to list Twilio phone numbers: ${err instanceof Error ? err.message : 'Unknown error'}`,
      )
    }

    if (phoneNumbers.length === 0) {
      console.log(`[SyncTwilioWebhook] Phone number ${phone_number} not found in Twilio account`)
      return createNotFoundError('Phone number', phone_number)
    }

    const twilioPhoneNumber = phoneNumbers[0]
    console.log(`[SyncTwilioWebhook] Found Twilio phone number: ${twilioPhoneNumber.sid}`)
    console.log(`[SyncTwilioWebhook] Current smsUrl: ${twilioPhoneNumber.smsUrl}`)
    console.log(`[SyncTwilioWebhook] New smsUrl: ${webhookUrl}`)

    // Update the SMS webhook URL
    try {
      const updated = await twilioClient.incomingPhoneNumbers(twilioPhoneNumber.sid).update({
        smsUrl: webhookUrl,
        smsMethod: 'POST',
      })

      console.log(`[SyncTwilioWebhook] Successfully updated SMS webhook for ${phone_number}`)

      return createSuccessResponse({
        status: 'success',
        message: `Successfully synced SMS webhook for ${phone_number}`,
        phone_number,
        webhook_url: webhookUrl,
        phone_number_sid: updated.sid,
      })
    } catch (err) {
      console.error('[SyncTwilioWebhook] Failed to update Twilio phone number:', err)
      return createPhoneError(
        `Failed to update Twilio phone number: ${err instanceof Error ? err.message : 'Unknown error'}`,
      )
    }
  },
}
