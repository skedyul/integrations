import { z, instance, communicationChannel, type z as ZodType, isRuntimeContext } from 'skedyul'
import type { ToolDefinition } from 'skedyul'

/**
 * Uninstall Tool for the Email App
 *
 * Removes the email address: {subdomain}@skedyul.app
 *
 * Steps:
 * 1. Get subdomain from context.workplace
 * 2. Find and delete the communication channel
 * 3. Delete the email address record
 */

const UninstallInputSchema = z.object({})

const UninstallOutputSchema = z.object({
  success: z.boolean(),
  email: z.string().describe('The removed email address'),
  channelDeleted: z.boolean().describe('Whether the channel was deleted'),
  addressDeleted: z.boolean().describe('Whether the email address was deleted'),
})

type UninstallInput = ZodType.infer<typeof UninstallInputSchema>
type UninstallOutput = ZodType.infer<typeof UninstallOutputSchema>

export const uninstallRegistry: ToolDefinition<UninstallInput, UninstallOutput> = {
  name: 'uninstall',
  description: 'Uninstall the Email app - removes {subdomain}@skedyul.app email address',
  inputSchema: UninstallInputSchema,
  outputSchema: UninstallOutputSchema,
  handler: async (_input, context) => {
    // This is a runtime-only tool (uninstall lifecycle)
    if (!isRuntimeContext(context)) {
      throw new Error('uninstall can only be called in a runtime context')
    }

    const subdomain = context.workplace.subdomain
    if (!subdomain) {
      throw new Error('Workplace subdomain not available in context')
    }

    const defaultEmail = `${subdomain}@skedyul.app`

    console.log(`[Email Uninstall] Uninstalling for workplace ${subdomain}`)
    console.log(`[Email Uninstall] Removing email: ${defaultEmail}`)

    let channelDeleted = false
    let addressDeleted = false

    // Step 1: Find and delete the communication channel
    const existingChannels = await communicationChannel.list({
      filter: { identifierValue: defaultEmail },
      limit: 1,
    })

    if (existingChannels.length > 0) {
      const channelId = existingChannels[0].id
      await communicationChannel.remove(channelId)
      channelDeleted = true
      console.log(`[Email Uninstall] Deleted channel: ${channelId}`)
    } else {
      console.log(`[Email Uninstall] No channel found for ${defaultEmail}`)
    }

    // Step 2: Find and delete the email address
    const existingAddresses = await instance.list('email_address', {
      filter: { email: defaultEmail },
      limit: 1,
    })

    if (existingAddresses.data.length > 0) {
      const addressId = (existingAddresses.data[0] as { id: string }).id
      await instance.delete('email_address', addressId)
      addressDeleted = true
      console.log(`[Email Uninstall] Deleted email address: ${addressId}`)
    } else {
      console.log(`[Email Uninstall] No email address found for ${defaultEmail}`)
    }

    console.log(`[Email Uninstall] Uninstallation complete for ${subdomain}`)

    return {
      output: {
        success: true,
        email: defaultEmail,
        channelDeleted,
        addressDeleted,
      },
      billing: { credits: 0 },
    }
  },
}
