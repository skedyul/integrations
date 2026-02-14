import type { UninstallHandlerContext, UninstallHandlerResult } from 'skedyul'
import { communicationChannel } from 'skedyul'
import twilio from 'twilio'

/**
 * Uninstall handler for the Phone app.
 * Called when the app is uninstalled so we can clean up Twilio webhook URLs
 * on phone numbers that were associated with this installation's communication channels.
 *
 * - Lists communication channels for this installation (via platform API)
 * - For each channel's phone number, clears smsUrl, voiceUrl, and statusCallback in Twilio
 * - Returns cleanedWebhookIds (channel IDs) so the platform can skip already-handled cleanup if needed
 */
export async function uninstallHandler(
  ctx: UninstallHandlerContext,
): Promise<UninstallHandlerResult> {
  const { env, appInstallationId } = ctx
  const accountSid = env.TWILIO_ACCOUNT_SID
  const authToken = env.TWILIO_AUTH_TOKEN

  const cleanedWebhookIds: string[] = []

  if (!accountSid || !authToken) {
    console.log(
      `[Phone uninstall] Missing Twilio credentials for installation ${appInstallationId}, skipping Twilio cleanup`,
    )
    return { cleanedWebhookIds }
  }

  try {
    const channels = await communicationChannel.list()
    const phoneChannels = channels.filter(
      (c) => c.appInstallationId === appInstallationId,
    )

    if (phoneChannels.length === 0) {
      console.log(
        `[Phone uninstall] No communication channels found for installation ${appInstallationId}`,
      )
      return { cleanedWebhookIds }
    }

    const client = twilio(accountSid, authToken)

    for (const channel of phoneChannels) {
      const phoneNumber = channel.identifierValue
      if (!phoneNumber) continue

      try {
        const phoneNumbers = await client.incomingPhoneNumbers.list({
          phoneNumber,
        })

        if (phoneNumbers.length === 0) {
          console.log(
            `[Phone uninstall] Phone number ${phoneNumber} not found in Twilio account, skipping`,
          )
          cleanedWebhookIds.push(channel.id)
          continue
        }

        await client.incomingPhoneNumbers(phoneNumbers[0].sid).update({
          smsUrl: '',
          smsMethod: 'POST',
          voiceUrl: '',
          voiceMethod: 'POST',
          statusCallback: '',
        })

        console.log(
          `[Phone uninstall] Cleared webhook URLs for ${phoneNumber} (channel ${channel.id})`,
        )
        cleanedWebhookIds.push(channel.id)
      } catch (err) {
        console.error(
          `[Phone uninstall] Failed to clear Twilio webhooks for ${phoneNumber}:`,
          err,
        )
        // Continue with other channels; still record so platform knows we attempted
        cleanedWebhookIds.push(channel.id)
      }
    }

    console.log(
      `[Phone uninstall] Cleaned ${cleanedWebhookIds.length} channel(s) for installation ${appInstallationId}`,
    )
    return { cleanedWebhookIds }
  } catch (err) {
    console.error(
      `[Phone uninstall] Error listing channels or cleaning Twilio:`,
      err,
    )
    throw err
  }
}
