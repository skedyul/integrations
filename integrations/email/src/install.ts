import skedyul from 'skedyul'
import type { InstallHandlerContext, InstallHandlerResult } from 'skedyul'

const { instance, communicationChannel } = skedyul

/**
 * Install handler for the Email app.
 * Called when a user installs the app.
 *
 * This handler:
 * 1. Creates the skedyul.app domain record (if not exists)
 * 2. Creates the default email address: {subdomain}@skedyul.app
 * 3. Creates the communication channel for the default address
 */
export default async function install(
  ctx: InstallHandlerContext,
): Promise<InstallHandlerResult> {
  const { workplace, env } = ctx
  const subdomain = workplace.subdomain
  const defaultEmail = `${subdomain}@skedyul.app`

  console.log(`[Email Install] Installing for workplace ${subdomain}`)
  console.log(`[Email Install] Default email: ${defaultEmail}`)

  // Validate required env vars
  if (!env.MAILGUN_API_KEY) {
    throw new Error('MAILGUN_API_KEY is required')
  }

  try {
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

    let addressId: string

    if (existingAddresses.data.length > 0) {
      addressId = (existingAddresses.data[0] as { id: string }).id
      console.log(`[Email Install] Email address already exists: ${addressId}`)
    } else {
      const address = await instance.create('email_address', {
        email: defaultEmail,
        name: workplace.name || subdomain,
        is_default: true,
        domain: domainId,
      })
      addressId = (address as { id: string }).id
      console.log(`[Email Install] Created email address: ${addressId}`)
    }

    // Step 3: Create the communication channel
    const existingChannels = await communicationChannel.list({
      filter: { identifierValue: defaultEmail },
      limit: 1,
    })

    if (existingChannels.length > 0) {
      console.log(
        `[Email Install] Channel already exists: ${existingChannels[0].id}`,
      )
    } else {
      const channel = await communicationChannel.create({
        channelHandle: 'email',
        identifierValue: defaultEmail,
        name: `${subdomain} Email`,
      })
      console.log(`[Email Install] Created channel: ${channel.id}`)
    }

    console.log(`[Email Install] Installation complete for ${subdomain}`)

    return {
      env: {},
    }
  } catch (error) {
    console.error('[Email Install] Installation failed:', error)
    throw error
  }
}
