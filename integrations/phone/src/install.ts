import type { InstallHandlerContext, InstallHandlerResult } from 'skedyul'

/**
 * Install handler for the Phone app.
 * Called when a user clicks "Install" after providing preInstall env variables.
 * 
 * This handler can:
 * - Validate the provided credentials (e.g., test Twilio API connection)
 * - Compute additional env variables
 * - Return an OAuth redirect URL if further authentication is needed
 */
export default async function install(ctx: InstallHandlerContext): Promise<InstallHandlerResult> {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = ctx.env

  // TODO: Validate Twilio credentials by making an API call
  // const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  // await twilioClient.api.accounts(TWILIO_ACCOUNT_SID).fetch()

  // For now, just pass through - actual validation can be added later
  console.log(`Installing Phone app for workplace ${ctx.workplace.subdomain}`)
  console.log(`Twilio Account SID: ${TWILIO_ACCOUNT_SID?.slice(0, 4)}...`)

  // Return any additional/computed env vars
  // If you need OAuth, return { redirect: 'https://...' }
  return {
    env: {
      // Any computed/derived env vars can go here
    },
  }
}
