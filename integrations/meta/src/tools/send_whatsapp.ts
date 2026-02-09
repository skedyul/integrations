import type { ToolDefinition } from 'skedyul'
import {
  MessageSendInputSchema,
  MessageSendOutputSchema,
  type MessageSendInput,
  type MessageSendOutput,
} from 'skedyul'
import { instance } from 'skedyul'
import { MetaClient } from '../lib/meta_client'

/**
 * Send a WhatsApp message via Meta Graph API.
 * Uses the standardized MessageSendInput/Output schemas for strict tool registry typing.
 */
export const sendWhatsAppRegistry: ToolDefinition<MessageSendInput, MessageSendOutput> = {
  name: 'send_whatsapp',
  label: 'Send WhatsApp',
  description: 'Send a WhatsApp message via Meta Graph API',
  inputSchema: MessageSendInputSchema,
  outputSchema: MessageSendOutputSchema,
  handler: async (input, context) => {
    // Provision-level env vars are baked into the container at provisioning time
    // Check process.env as fallback if not in context.env
    const META_APP_ID = context.env.META_APP_ID || process.env.META_APP_ID
    const META_APP_SECRET = context.env.META_APP_SECRET || process.env.META_APP_SECRET
    // META_ACCESS_TOKEN is per-installation (from OAuth), so it should be in context.env
    const META_ACCESS_TOKEN = context.env.META_ACCESS_TOKEN

    if (!META_ACCESS_TOKEN) {
      throw new Error('META_ACCESS_TOKEN is not configured. Please complete the OAuth flow.')
    }

    if (!META_APP_ID || !META_APP_SECRET) {
      throw new Error('META_APP_ID and META_APP_SECRET must be configured. Make sure they are set in the app version\'s provision-level environment variables.')
    }

    // Get the phone number ID from the channel identifier
    const channelIdentifier = input.channel.identifierValue

    // Look up the whatsapp_phone_number instance to get the phone_number_id
    const phoneNumbers = await instance.list('whatsapp_phone_number', {
      filter: { phone: channelIdentifier },
      limit: 1,
    })

    if (phoneNumbers.data.length === 0) {
      throw new Error(`WhatsApp phone number not found: ${channelIdentifier}`)
    }

    const phoneNumber = phoneNumbers.data[0] as { phone_number_id: string }
    const phoneNumberId = phoneNumber.phone_number_id

    // Initialize Meta client
    const client = new MetaClient(META_APP_ID, META_APP_SECRET)

    // Send the message
    const result = await client.sendMessage(
      phoneNumberId,
      input.subscription.identifierValue,
      input.message.content,
      META_ACCESS_TOKEN,
    )

    return {
      output: {
        status: 'sent',
        remoteId: result.messages[0]?.id || '',
      },
      billing: {
        credits: 1,
      },
    }
  },
}
