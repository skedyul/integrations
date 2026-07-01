import skedyul, { type z as ZodType, instance, webhook, isRuntimeContext } from 'skedyul'
import type { ToolDefinition } from 'skedyul'
import { createTwilioClient } from '../lib/twilio_client'
import {
  createSuccessResponse,
  createValidationError,
  createNotFoundError,
  createPhoneError,
} from '../lib/response'

const { z } = skedyul

const UpdateForwardingNumberInputSchema = z.object({
  inbound_voice_enabled: z
    .union([z.boolean(), z.string()])
    .optional()
    .describe('Whether inbound voice is enabled'),
  forwarding_phone_number: z
    .string()
    .optional()
    .describe('Forwarding phone number to save'),
  phone_id: z.string().optional().describe('Instance ID from path params'),
})

const UpdateForwardingNumberOutputSchema = z.object({
  status: z.string(),
  message: z.string().optional(),
})

type UpdateForwardingNumberInput = ZodType.infer<typeof UpdateForwardingNumberInputSchema>
type UpdateForwardingNumberOutput = ZodType.infer<typeof UpdateForwardingNumberOutputSchema>

function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value.toLowerCase().trim() === 'true'
  return false
}

async function ensureReceiveCallVoiceUrl(): Promise<string> {
  // Always mint a fresh registration so Twilio never points at a stale/deleted whreg_ URL
  // (common after DB resets or switching between local/deploy environments).
  try {
    const { count } = await webhook.deleteByName('receive_call')
    if (count > 0) {
      console.log('[UpdateForwardingNumber] Cleared', count, 'stale receive_call registration(s)')
    }
  } catch (deleteError) {
    console.error('[UpdateForwardingNumber] Failed to clear receive_call registrations:', deleteError)
  }

  const result = await webhook.create('receive_call')
  console.log('[UpdateForwardingNumber] Created receive_call webhook:', result.url)
  return result.url
}

async function configureTwilioVoiceUrl(
  twilioClient: ReturnType<typeof createTwilioClient>,
  phoneE164: string,
  forwardingValue: string,
): Promise<{ voiceUrl?: string; error?: string }> {
  const phoneNumbers = await twilioClient.incomingPhoneNumbers.list({
    phoneNumber: phoneE164,
  })

  if (phoneNumbers.length === 0) {
    return { error: 'Phone number not found in Twilio account' }
  }

  const phoneNumberSid = phoneNumbers[0].sid

  if (forwardingValue) {
    const voiceUrl = await ensureReceiveCallVoiceUrl()

    await twilioClient.incomingPhoneNumbers(phoneNumberSid).update({
      voiceUrl,
      voiceMethod: 'GET',
    })

    return { voiceUrl }
  }

  await twilioClient.incomingPhoneNumbers(phoneNumberSid).update({
    voiceUrl: '',
    voiceMethod: 'POST',
  })

  return {}
}

export const updateForwardingNumberRegistry: ToolDefinition<
  UpdateForwardingNumberInput,
  UpdateForwardingNumberOutput
> = {
  name: 'update_forwarding_number',
  label: 'Update Inbound Voice',
  description:
    'Updates inbound voice settings, forwarding number, and Twilio voiceUrl/webhooks',
  inputSchema: UpdateForwardingNumberInputSchema,
  outputSchema: UpdateForwardingNumberOutputSchema,
  handler: async (input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    const phoneNumberId = input.phone_id || context.request.params?.phone_id
    if (!phoneNumberId) {
      return createValidationError('Missing phone_id')
    }

    let phoneRecord: {
      phone?: string
      inbound_voice_enabled?: boolean
      forwarding_phone_number?: string | null
    } | null = null
    try {
      phoneRecord = (await instance.get('phone_number', phoneNumberId)) as {
        phone?: string
        inbound_voice_enabled?: boolean
        forwarding_phone_number?: string | null
      } | null
    } catch (error) {
      console.error('[UpdateForwardingNumber] Failed to fetch phone_number instance', error)
      return createPhoneError('Failed to fetch phone number record')
    }

    if (!phoneRecord?.phone) {
      return createNotFoundError('Phone number', phoneNumberId)
    }

    const inboundEnabled =
      input.inbound_voice_enabled === undefined
        ? Boolean(
            phoneRecord.inbound_voice_enabled ||
              phoneRecord.forwarding_phone_number,
          )
        : parseBoolean(input.inbound_voice_enabled)
    const forwardingValue =
      input.forwarding_phone_number !== undefined
        ? input.forwarding_phone_number.trim()
        : (phoneRecord.forwarding_phone_number ?? '').trim()

    if (inboundEnabled && !forwardingValue) {
      return createValidationError(
        'Provide a forwarding phone number before enabling inbound voice',
      )
    }

    const modelUpdate = {
      inbound_voice_enabled: inboundEnabled,
      forwarding_phone_number: inboundEnabled ? forwardingValue : null,
    }

    try {
      await instance.update('phone_number', phoneNumberId, modelUpdate)
    } catch (error) {
      console.error('[UpdateForwardingNumber] Failed to save inbound voice settings', error)
      return createPhoneError(
        `Failed to save inbound voice settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }

    try {
      const twilioClient = createTwilioClient(context.env)
      const twilioResult = await configureTwilioVoiceUrl(
        twilioClient,
        phoneRecord.phone,
        inboundEnabled ? forwardingValue : '',
      )

      if (twilioResult.error) {
        return createPhoneError(
          `Inbound voice settings saved, but ${twilioResult.error}`,
        )
      }

      if (inboundEnabled && forwardingValue) {
        return createSuccessResponse({
          status: 'success',
          message: 'Inbound voice enabled and Twilio webhooks configured',
        })
      }

      return createSuccessResponse({
        status: 'success',
        message: 'Inbound voice disabled and Twilio voice URL cleared',
      })
    } catch (error) {
      console.error('[UpdateForwardingNumber] Failed to configure Twilio', error)
      return createPhoneError(
        `Inbound voice settings saved, but failed to configure Twilio: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  },
}
