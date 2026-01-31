import skedyul, { type z as ZodType, instance, communicationChannel, isRuntimeContext } from 'skedyul'
import type { ToolDefinition } from 'skedyul'

const { z } = skedyul

/**
 * Input schema for the update_phone_details form action handler.
 * This handler is triggered by the Save button on the phone number details form.
 */
const UpdatePhoneDetailsInputSchema = z.object({
  /** New name for the phone number */
  name: z.string().optional().describe('New friendly name for the phone number'),
  /** Instance ID from path params (e.g., /phone-numbers/[phone_id]/overview) */
  phone_id: z.string().optional().describe('Instance ID from path params'),
})

const UpdatePhoneDetailsOutputSchema = z.object({
  status: z.string().describe('Update status'),
  message: z.string().optional().describe('Status message'),
})

type UpdatePhoneDetailsInput = ZodType.infer<typeof UpdatePhoneDetailsInputSchema>
type UpdatePhoneDetailsOutput = ZodType.infer<typeof UpdatePhoneDetailsOutputSchema>

export const updatePhoneDetailsRegistry: ToolDefinition<
  UpdatePhoneDetailsInput,
  UpdatePhoneDetailsOutput
> = {
  name: 'update_phone_details',
  description: 'Updates the phone number details (name) in both the phone_number model and the communication channel',
  inputs: UpdatePhoneDetailsInputSchema,
  outputSchema: UpdatePhoneDetailsOutputSchema,
  handler: async (input, context) => {
    // This is a runtime-only tool
    if (!isRuntimeContext(context)) {
      return {
        output: {
          status: 'error',
          message: 'This tool can only be called in a runtime context',
        },
        billing: { credits: 0 },
      }
    }

    // Get phone_id from input or context.request.params (path params)
    const phoneNumberId = input.phone_id || context.request.params?.phone_id
    const { name } = input

    // Validate phone number ID is provided
    if (!phoneNumberId) {
      return {
        output: {
          status: 'error',
          message: 'Missing required field: phone_id',
        },
        billing: { credits: 0 },
      }
    }

    // Validate that at least name is provided to update
    if (!name) {
      return {
        output: {
          status: 'error',
          message: 'No fields to update. Provide a name.',
        },
        billing: { credits: 0 },
      }
    }

    console.log('[UpdatePhoneDetails] Updating phone number:', phoneNumberId, 'with name:', name)

    // 1. Fetch the phone_number instance to get the phone value
    let phoneNumberInstance: { id: string; phone?: string; name?: string } | null = null

    try {
      phoneNumberInstance = await instance.get('phone_number', phoneNumberId)
      console.log('[UpdatePhoneDetails] Current instance:', JSON.stringify(phoneNumberInstance, null, 2))
    } catch (err) {
      console.error('[UpdatePhoneDetails] Failed to fetch phone_number instance:', err)
      return {
        output: {
          status: 'error',
          message: `Failed to fetch phone number: ${err instanceof Error ? err.message : 'Unknown error'}`,
        },
        billing: { credits: 0 },
      }
    }

    if (!phoneNumberInstance) {
      return {
        output: {
          status: 'error',
          message: `Phone number not found: ${phoneNumberId}`,
        },
        billing: { credits: 0 },
      }
    }

    const phoneValue = phoneNumberInstance.phone
    if (!phoneValue) {
      return {
        output: {
          status: 'error',
          message: 'Phone number instance is missing the phone field',
        },
        billing: { credits: 0 },
      }
    }

    // 2. Update the phone_number instance with the new name
    try {
      await instance.update('phone_number', phoneNumberId, { name })
      console.log('[UpdatePhoneDetails] Successfully updated phone_number instance')
    } catch (err) {
      console.error('[UpdatePhoneDetails] Failed to update phone_number instance:', err)
      return {
        output: {
          status: 'error',
          message: `Failed to update phone number record: ${err instanceof Error ? err.message : 'Unknown error'}`,
        },
        billing: { credits: 0 },
      }
    }

    // 3. Find the CommunicationChannel by identifierValue (phone number)
    console.log('[UpdatePhoneDetails] Looking for CommunicationChannel with identifierValue:', phoneValue)
    let channels: Array<{ id: string; name: string }> = []

    try {
      channels = await communicationChannel.list({
        filter: { identifierValue: phoneValue },
        limit: 1,
      })
      console.log('[UpdatePhoneDetails] Found channels:', JSON.stringify(channels, null, 2))
    } catch (err) {
      console.error('[UpdatePhoneDetails] Failed to list communication channels:', err)
      // Continue even if we can't find the channel - the instance was already updated
    }

    // 4. Update the CommunicationChannel name if found
    if (channels.length > 0) {
      const channel = channels[0]
      console.log('[UpdatePhoneDetails] Updating CommunicationChannel:', channel.id, 'with name:', name)

      try {
        await communicationChannel.update(channel.id, { name })
        console.log('[UpdatePhoneDetails] Successfully updated CommunicationChannel')
      } catch (err) {
        console.error('[UpdatePhoneDetails] Failed to update CommunicationChannel:', err)
        // Return partial success - instance was updated but channel wasn't
        return {
          output: {
            status: 'partial_success',
            message: `Phone number name updated, but failed to update channel: ${err instanceof Error ? err.message : 'Unknown error'}`,
          },
          billing: { credits: 0 },
        }
      }
    } else {
      console.log('[UpdatePhoneDetails] No CommunicationChannel found for this phone number')
    }

    return {
      output: {
        status: 'success',
        message: `Successfully updated phone number name to "${name}"`,
      },
      billing: { credits: 0 },
    }
  },
}
