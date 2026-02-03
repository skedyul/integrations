import type { InstallHandlerContext, InstallHandlerResult } from 'skedyul'
import { instance, communicationChannel } from 'skedyul'

/**
 * Install handler for the Email app.
 *
 * Creates the default email address: {subdomain}@skedyul.app
 *
 * Note: The skedyul.app domain is created during provisioning (provision.ts).
 *       This handler only creates per-installation resources.
 *
 * Steps:
 * 1. Get subdomain from context.workplace
 * 2. Find the skedyul.app domain (created during provision)
 * 3. Create the email address record
 * 4. Create the communication channel
 */
export default async function install(
  ctx: InstallHandlerContext,
): Promise<InstallHandlerResult> {
  const subdomain = ctx.workplace.subdomain
  if (!subdomain) {
    throw new Error('Workplace subdomain not available in context')
  }

  const defaultEmail = `${subdomain}@skedyul.app`

  console.log(`[Email Install] Installing for workplace ${subdomain}`)
  console.log(`[Email Install] Default email: ${defaultEmail}`)

  // Step 1: Find the skedyul.app domain (created during provision)
  const existingDomains = await instance.list('email_domain', {
    filter: { domain: 'skedyul.app' },
    limit: 1,
  })

  if (existingDomains.data.length === 0) {
    throw new Error(
      'skedyul.app domain not found. The app may not have been provisioned correctly.',
    )
  }

  const domainId = (existingDomains.data[0] as { id: string }).id
  console.log(`[Email Install] Using domain: ${domainId}`)

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
    console.log(
      `[Email Install] Created email address: ${(address as { id: string }).id}`,
    )
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

  // Return empty - no additional env vars needed
  return {}
}
