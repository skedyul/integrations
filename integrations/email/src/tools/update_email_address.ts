import skedyul, { type z as ZodType, instance, communicationChannel, isRuntimeContext } from 'skedyul'
import type { ToolDefinition } from 'skedyul'

const { z } = skedyul

/**
 * Input schema for updating email address details.
 * Similar to the phone app's update_phone_details handler.
 */
const UpdateEmailAddressInputSchema = z.object({
  /** Instance ID from path params (e.g., /email) - auto-populated from context */
  email_address_id: z.string().optional().describe('ID of the email address to update'),
  /** New name for the email address - also updates the communication channel */
  name: z.string().optional().describe('Display name for outgoing emails'),
})

const UpdateEmailAddressOutputSchema = z.object({
  status: z.string().describe('Update status'),
  message: z.string().optional().describe('Status message'),
})

type UpdateEmailAddressInput = ZodType.infer<typeof UpdateEmailAddressInputSchema>
type UpdateEmailAddressOutput = ZodType.infer<typeof UpdateEmailAddressOutputSchema>

export const updateEmailAddressRegistry: ToolDefinition<
  UpdateEmailAddressInput,
  UpdateEmailAddressOutput
> = {
  name: 'update_email_address',
  label: 'Update Email Address',
  description: 'Updates the email address details (name) in both the email_address model and the communication channel',
  inputSchema: UpdateEmailAddressInputSchema,
  outputSchema: UpdateEmailAddressOutputSchema,
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

    // Get email_address_id from input, context.request.params, or fetch the first one
    // (Since app only supports one email address per installation)
    let emailAddressId = input.email_address_id || context.request.params?.email_address_id
    const { name } = input

    // If no ID provided, fetch the first email address (there's only one per installation)
    if (!emailAddressId) {
      try {
        const emailAddresses = await instance.list('email_address', { limit: 1 })
        if (emailAddresses.data.length > 0) {
          emailAddressId = (emailAddresses.data[0] as { id: string }).id
          console.log('[UpdateEmailAddress] No ID provided, using first email address:', emailAddressId)
        }
      } catch (err) {
        console.error('[UpdateEmailAddress] Failed to fetch email addresses:', err)
      }
    }

    // Validate email address ID is available
    if (!emailAddressId) {
      return {
        output: {
          status: 'error',
          message: 'No email address found. Please ensure the app is installed correctly.',
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

    console.log('[UpdateEmailAddress] Updating email address:', emailAddressId, 'with name:', name)

    // 1. Fetch the email_address instance to get the email value
    let emailAddressInstance: { id: string; email?: string; name?: string } | null = null

    try {
      emailAddressInstance = await instance.get('email_address', emailAddressId)
      console.log('[UpdateEmailAddress] Current instance:', JSON.stringify(emailAddressInstance, null, 2))
    } catch (err) {
      console.error('[UpdateEmailAddress] Failed to fetch email_address instance:', err)
      return {
        output: {
          status: 'error',
          message: `Failed to fetch email address: ${err instanceof Error ? err.message : 'Unknown error'}`,
        },
        billing: { credits: 0 },
      }
    }

    if (!emailAddressInstance) {
      return {
        output: {
          status: 'error',
          message: `Email address not found: ${emailAddressId}`,
        },
        billing: { credits: 0 },
      }
    }

    const emailValue = emailAddressInstance.email
    if (!emailValue) {
      return {
        output: {
          status: 'error',
          message: 'Email address instance is missing the email field',
        },
        billing: { credits: 0 },
      }
    }

    // 2. Update the email_address instance with the new name
    try {
      await instance.update('email_address', emailAddressId, { name })
      console.log('[UpdateEmailAddress] Successfully updated email_address instance')
    } catch (err) {
      console.error('[UpdateEmailAddress] Failed to update email_address instance:', err)
      return {
        output: {
          status: 'error',
          message: `Failed to update email address record: ${err instanceof Error ? err.message : 'Unknown error'}`,
        },
        billing: { credits: 0 },
      }
    }

    // 3. Find the CommunicationChannel by identifierValue (email address)
    console.log('[UpdateEmailAddress] Looking for CommunicationChannel with identifierValue:', emailValue)
    let channels: Array<{ id: string; name: string }> = []

    try {
      channels = await communicationChannel.list({
        filter: { identifierValue: emailValue },
        limit: 1,
      })
      console.log('[UpdateEmailAddress] Found channels:', JSON.stringify(channels, null, 2))
    } catch (err) {
      console.error('[UpdateEmailAddress] Failed to list communication channels:', err)
      // Continue even if we can't find the channel - the instance was already updated
    }

    // 4. Update the CommunicationChannel name if found
    if (channels.length > 0) {
      const channel = channels[0]
      console.log('[UpdateEmailAddress] Updating CommunicationChannel:', channel.id, 'with name:', name)

      try {
        await communicationChannel.update(channel.id, { name })
        console.log('[UpdateEmailAddress] Successfully updated CommunicationChannel')
      } catch (err) {
        console.error('[UpdateEmailAddress] Failed to update CommunicationChannel:', err)
        // Return partial success - instance was updated but channel wasn't
        return {
          output: {
            status: 'partial_success',
            message: `Email address name updated, but failed to update channel: ${err instanceof Error ? err.message : 'Unknown error'}`,
          },
          billing: { credits: 0 },
        }
      }
    } else {
      console.log('[UpdateEmailAddress] No CommunicationChannel found for this email address')
    }

    return {
      output: {
        status: 'success',
        message: `Successfully updated email address name to "${name}"`,
      },
      billing: { credits: 0 },
    }
  },
}
