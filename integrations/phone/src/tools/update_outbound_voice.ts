import skedyul, { type z as ZodType, instance, isRuntimeContext } from 'skedyul'
import type { ToolDefinition } from 'skedyul'
import {
  createSuccessResponse,
  createValidationError,
  createNotFoundError,
  createPhoneError,
} from '../lib/response'

const { z } = skedyul

const UpdateOutboundVoiceInputSchema = z.object({
  outbound_voice_enabled: z
    .union([z.boolean(), z.string()])
    .optional()
    .describe('Whether outbound voice is enabled'),
  value: z
    .union([z.boolean(), z.string()])
    .optional()
    .describe('Field change value for outbound_voice_enabled'),
  phone_id: z.string().optional().describe('Instance ID from path params'),
})

const UpdateOutboundVoiceOutputSchema = z.object({
  status: z.string(),
  message: z.string().optional(),
})

type UpdateOutboundVoiceInput = ZodType.infer<typeof UpdateOutboundVoiceInputSchema>
type UpdateOutboundVoiceOutput = ZodType.infer<typeof UpdateOutboundVoiceOutputSchema>

function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value.toLowerCase().trim() === 'true'
  return false
}

export const updateOutboundVoiceRegistry: ToolDefinition<
  UpdateOutboundVoiceInput,
  UpdateOutboundVoiceOutput
> = {
  name: 'update_outbound_voice',
  label: 'Update Outbound Voice',
  description: 'Updates the outbound voice enabled setting for a phone number',
  inputSchema: UpdateOutboundVoiceInputSchema,
  outputSchema: UpdateOutboundVoiceOutputSchema,
  handler: async (input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    const phoneNumberId = input.phone_id || context.request.params?.phone_id
    if (!phoneNumberId) {
      return createValidationError('Missing phone_id')
    }

    if (
      input.outbound_voice_enabled === undefined &&
      input.value === undefined
    ) {
      return createValidationError('Missing outbound_voice_enabled')
    }

    const enabled = parseBoolean(input.outbound_voice_enabled ?? input.value)

    try {
      const phoneRecord = await instance.get('phone_number', phoneNumberId)
      if (!phoneRecord) {
        return createNotFoundError('Phone number', phoneNumberId)
      }

      await instance.update('phone_number', phoneNumberId, {
        outbound_voice_enabled: enabled,
      })

      return createSuccessResponse({
        status: 'success',
        message: enabled
          ? 'Outbound voice enabled'
          : 'Outbound voice disabled',
      })
    } catch (error) {
      console.error('[UpdateOutboundVoice] Failed to update phone number', error)
      return createPhoneError(
        `Failed to update outbound voice setting: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  },
}
