import { z, instance, communicationChannel, type z as ZodType } from 'skedyul'
import type { ToolDefinition } from 'skedyul'

/**
 * Install Tool for the Email App
 *
 * Creates the default email address: {subdomain}@skedyul.app
 *
 * Steps:
 * 1. Get subdomain from context.workplace
 * 2. Create/find the skedyul.app domain record
 * 3. Create the email address record
 * 4. Create the communication channel
 */

const InstallInputSchema = z.object({})

const InstallOutputSchema = z.object({
  success: z.boolean(),
  email: z.string().describe('The created email address'),
  channelId: z.string().optional().describe('The communication channel ID'),
})

type InstallInput = ZodType.infer<typeof InstallInputSchema>
type InstallOutput = ZodType.infer<typeof InstallOutputSchema>

export const installRegistry: ToolDefinition<InstallInput, InstallOutput> = {
  name: 'install',
  description: 'Install the Email app - creates {subdomain}@skedyul.app email address',
  inputs: InstallInputSchema,
  outputSchema: InstallOutputSchema,
  handler: async (_input, context) => {
    const subdomain = context.workplace?.subdomain
    if (!subdomain) {
      throw new Error('Workplace subdomain not available in context')
    }

    const defaultEmail = `${subdomain}@skedyul.app`

    console.log(`[Email Install] Installing for workplace ${subdomain}`)
    console.log(`[Email Install] Default email: ${defaultEmail}`)

    // Step 1: Create or find the skedyul.app domain
    const existingDomains = await instance.list('email_domain', {
      filter: { domain: 'skedyul.app' },
      limit: 1,
    })

    let domainId: string

    if (existingDomains.data.length > 0) {
      domainId = (existingDomains.data[0] as { id: string }).id
      console.log(`[Email Install] Using existing domain: ${domainId}`)
    } else {
      const domain = await instance.create('email_domain', {
        domain: 'skedyul.app',
        type: 'SYSTEM',
        status: 'ACTIVE',
      })
      domainId = (domain as { id: string }).id
      console.log(`[Email Install] Created domain: ${domainId}`)
    }

    // Step 2: Create the default email address
    const existingAddresses = await instance.list('email_address', {
      filter: { email: defaultEmail },
      limit: 1,
    })

    if (existingAddresses.data.length > 0) {
      const addressId = (existingAddresses.data[0] as { id: string }).id
      console.log(`[Email Install] Email address already exists: ${addressId}`)
    } else {
      const address = await instance.create('email_address', {
        email: defaultEmail,
        name: subdomain,
        is_default: true,
        domain: domainId,
      })
      console.log(`[Email Install] Created email address: ${(address as { id: string }).id}`)
    }

    // Step 3: Create the communication channel
    const existingChannels = await communicationChannel.list({
      filter: { identifierValue: defaultEmail },
      limit: 1,
    })

    let channelId: string | undefined

    if (existingChannels.length > 0) {
      channelId = existingChannels[0].id
      console.log(`[Email Install] Channel already exists: ${channelId}`)
    } else {
      const channel = await communicationChannel.create('email', {
        identifierValue: defaultEmail,
        name: `${subdomain} Email`,
      })
      channelId = channel.id
      console.log(`[Email Install] Created channel: ${channelId}`)
    }

    console.log(`[Email Install] Installation complete for ${subdomain}`)

    return {
      output: {
        success: true,
        email: defaultEmail,
        channelId,
      },
      billing: { credits: 0 },
    }
  },
}
