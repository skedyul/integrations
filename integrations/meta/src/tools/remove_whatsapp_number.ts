import type { ToolDefinition } from 'skedyul'
import { z, isRuntimeContext, instance } from 'skedyul'
import { removeChannelByIdentifier } from '../lib/remove_messaging_resource'
import {
  createSuccessResponse,
  createValidationError,
  createNotFoundError,
  createMetaError,
} from '../lib/response'

const RemoveWhatsAppNumberInputSchema = z.object({
  whatsapp_phone_number_id: z.string().optional(),
  instance_id: z.string().optional(),
  whatsapp_id: z.string().optional(),
})

const RemoveWhatsAppNumberOutputSchema = z.object({
  status: z.string(),
  message: z.string().optional(),
})

type RemoveWhatsAppNumberInput = z.infer<typeof RemoveWhatsAppNumberInputSchema>
type RemoveWhatsAppNumberOutput = z.infer<typeof RemoveWhatsAppNumberOutputSchema>

export const removeWhatsAppNumberRegistry: ToolDefinition<
  RemoveWhatsAppNumberInput,
  RemoveWhatsAppNumberOutput
> = {
  name: 'remove_whatsapp_number',
  label: 'Remove WhatsApp Number',
  description:
    'Removes a WhatsApp number from the installation, deleting its channel and subscriptions',
  inputSchema: RemoveWhatsAppNumberInputSchema,
  outputSchema: RemoveWhatsAppNumberOutputSchema,
  handler: async (input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    const instanceId =
      input.whatsapp_phone_number_id ||
      input.instance_id ||
      input.whatsapp_id ||
      context.request.params?.whatsapp_id

    if (!instanceId) {
      return createValidationError(
        'Missing required field: whatsapp_phone_number_id, instance_id, or whatsapp_id',
      )
    }

    let record: { id: string; phone?: string } | null = null
    try {
      record = await instance.get('whatsapp_phone_number', instanceId)
    } catch (err) {
      return createMetaError(
        `Failed to fetch WhatsApp number: ${err instanceof Error ? err.message : 'Unknown error'}`,
      )
    }

    if (!record?.phone) {
      return createNotFoundError('WhatsApp phone number', instanceId)
    }

    try {
      await removeChannelByIdentifier(record.phone)
    } catch (err) {
      return createMetaError(
        `Failed to delete WhatsApp channel: ${err instanceof Error ? err.message : 'Unknown error'}`,
      )
    }

    try {
      await instance.delete('whatsapp_phone_number', instanceId)
    } catch (err) {
      return createMetaError(
        `Failed to delete WhatsApp number record: ${err instanceof Error ? err.message : 'Unknown error'}`,
      )
    }

    return createSuccessResponse(
      {
        status: 'success',
        message: `Successfully removed WhatsApp number ${record.phone}`,
      },
      { effect: { redirect: '/whatsapp-numbers' } },
    )
  },
}
