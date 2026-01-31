import skedyul, { type z as ZodType, instance, communicationChannel, isRuntimeContext } from 'skedyul'
import type { ToolDefinition } from 'skedyul'

const { z } = skedyul

/**
 * Input schema for the remove_phone_number form submit handler.
 * This handler is called when a user confirms removal of a phone number.
 * Accepts phone_number_id, instance_id, or phone_id (from input or context.params).
 */
const RemovePhoneNumberInputSchema = z.object({
  /** Instance ID of the phone number to remove (from hidden field) */
  phone_number_id: z.string().optional().describe('Instance ID of the phone number to remove'),
  /** Instance ID passed automatically from modal context */
  instance_id: z.string().optional().describe('Instance ID from modal context'),
  /** Instance ID from path params (e.g., /phone-numbers/[phone_id]/overview) */
  phone_id: z.string().optional().describe('Instance ID from path params'),
})
// Note: We don't use .refine() here because phone_id can also come from context.params

const RemovePhoneNumberOutputSchema = z.object({
  status: z.string().describe('Removal status'),
  message: z.string().optional().describe('Status message'),
})

type RemovePhoneNumberInput = ZodType.infer<typeof RemovePhoneNumberInputSchema>
type RemovePhoneNumberOutput = ZodType.infer<typeof RemovePhoneNumberOutputSchema>

export const removePhoneNumberRegistry: ToolDefinition<
  RemovePhoneNumberInput,
  RemovePhoneNumberOutput
> = {
  name: 'remove_phone_number',
  description: 'Removes a phone number from the account, deleting its SMS channel and subscriptions',
  inputs: RemovePhoneNumberInputSchema,
  outputSchema: RemovePhoneNumberOutputSchema,
  handler: async (input, context) => {
    // This is a runtime-only tool (form_submit/page_action)
    if (!isRuntimeContext(context)) {
      return {
        output: {
          status: 'error',
          message: 'This tool can only be called in a runtime context',
        },
        billing: { credits: 0 },
      }
    }

    // Accept phone_number_id (from hidden field), instance_id (from modal context), 
    // phone_id (from input), or phone_id from context.request.params (path params)
    const phoneNumberId = input.phone_number_id || input.instance_id || input.phone_id || context.request.params?.phone_id
    const { appInstallationId, workplace } = context

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

    // Validate phone number ID is provided (from any source)
    if (!phoneNumberId) {
      return {
        output: {
          status: 'error',
          message: 'Missing required field: phone_number_id, instance_id, or phone_id',
        },
        billing: { credits: 0 },
      }
    }

    // 1. Fetch the phone_number instance to get the phone value
    console.log('[RemovePhoneNumber] Fetching phone_number instance:', phoneNumberId)
    let phoneNumberInstance: { id: string; phone?: string } | null = null

    try {
      phoneNumberInstance = await instance.get('phone_number', phoneNumberId)
      console.log('[RemovePhoneNumber] instance.get result:', JSON.stringify(phoneNumberInstance, null, 2))
    } catch (err) {
      console.error('[RemovePhoneNumber] Failed to fetch phone_number instance:', err)
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

    console.log('[RemovePhoneNumber] Phone value:', phoneValue)

    // 2. Find the CommunicationChannel by identifierValue (phone number)
    console.log('[RemovePhoneNumber] Looking for CommunicationChannel with identifierValue:', phoneValue)
    let channels: Array<{ id: string }> = []

    try {
      channels = await communicationChannel.list({
        filter: { identifierValue: phoneValue },
        limit: 1,
      })
      console.log('[RemovePhoneNumber] Found channels:', JSON.stringify(channels, null, 2))
    } catch (err) {
      console.error('[RemovePhoneNumber] Failed to list communication channels:', err)
      // Continue even if we can't find the channel - still delete the instance
    }

    // 3. Delete the CommunicationChannel if found (cascades subscriptions, preserves messages)
    if (channels.length > 0) {
      const channel = channels[0]
      console.log('[RemovePhoneNumber] Deleting CommunicationChannel:', channel.id)

      try {
        await communicationChannel.remove(channel.id)
        console.log('[RemovePhoneNumber] Successfully deleted CommunicationChannel')
      } catch (err) {
        console.error('[RemovePhoneNumber] Failed to delete CommunicationChannel:', err)
        return {
          output: {
            status: 'error',
            message: `Failed to delete communication channel: ${err instanceof Error ? err.message : 'Unknown error'}`,
          },
          billing: { credits: 0 },
        }
      }
    } else {
      console.log('[RemovePhoneNumber] No CommunicationChannel found for this phone number')
    }

    // 4. Delete the phone_number instance
    console.log('[RemovePhoneNumber] Deleting phone_number instance:', phoneNumberId)

    try {
      await instance.delete('phone_number', phoneNumberId)
      console.log('[RemovePhoneNumber] Successfully deleted phone_number instance')
    } catch (err) {
      console.error('[RemovePhoneNumber] Failed to delete phone_number instance:', err)
      return {
        output: {
          status: 'error',
          message: `Failed to delete phone number record: ${err instanceof Error ? err.message : 'Unknown error'}`,
        },
        billing: { credits: 0 },
      }
    }

    // Note: Twilio phone number is NOT released - retained for potential transfer

    return {
      output: {
        status: 'success',
        message: `Successfully removed phone number ${phoneValue}`,
      },
      billing: { credits: 0 },
      effect: {
        redirect: `/phone-numbers`,
      },
    }
  },
}
