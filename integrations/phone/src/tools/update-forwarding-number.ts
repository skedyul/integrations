import skedyul, { type z as ZodType, instance } from 'skedyul'
import type { ToolDefinition } from 'skedyul'

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
  description: 'Updates the call forwarding number for this phone record',
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

    try {
      await instance.update('phone_number', phoneNumberId, {
        forwarding_phone_number: forwardingValue || null,
      })
      return {
        output: {
          status: 'success',
          message: 'Forwarding number saved',
        },
        billing: { credits: 0 },
      }
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
  },
}
