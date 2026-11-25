import type { ToolDefinition } from 'skedyul'
import {
  MessageSendInputSchema,
  MessageSendOutputSchema,
  type MessageSendInput,
  type MessageSendOutput,
  AppAuthInvalidError,
} from 'skedyul'
import { instance } from 'skedyul'
import { MetaClient } from '../lib/meta_client'
import { MetaWindowClosedError, WINDOW_CLOSED_FAILURE_REASON } from '../lib/meta_send_errors'
import {
  phoneDigits,
  whatsappPhoneLookupKeys,
} from '../lib/meta_webhook/phone_identifier'
import {
  createSuccessResponse,
  createValidationError,
  createAuthError,
  createNotFoundError,
} from '../lib/response'

/**
 * Send a WhatsApp message via Meta Graph API (1:1 or group).
 */
export const sendWhatsAppRegistry: ToolDefinition<MessageSendInput, MessageSendOutput> = {
  name: 'send_whatsapp',
  label: 'Send WhatsApp',
  ui: {
    title: 'Sent WhatsApp message',
    activeTitle: 'Sending WhatsApp message',
  },
  description: 'Send a WhatsApp message via Meta Graph API',
  inputSchema: MessageSendInputSchema,
  outputSchema: MessageSendOutputSchema,
  handler: async (input, context) => {
    const META_APP_ID = context.env.META_APP_ID || process.env.META_APP_ID
    const META_APP_SECRET = context.env.META_APP_SECRET || process.env.META_APP_SECRET
    const GRAPH_API_VERSION = context.env.GRAPH_API_VERSION || process.env.GRAPH_API_VERSION
    const META_ACCESS_TOKEN = context.env.META_ACCESS_TOKEN

    if (!META_ACCESS_TOKEN) {
      return createAuthError('META_ACCESS_TOKEN is not configured. Please complete the OAuth flow.')
    }

    if (!META_APP_ID || !META_APP_SECRET) {
      return createAuthError(
        'META_APP_ID and META_APP_SECRET must be configured.',
      )
    }

    if (!GRAPH_API_VERSION) {
      return createAuthError('GRAPH_API_VERSION must be configured.')
    }

    const channelIdentifier = input.channel.identifierValue
    const groupId = input.group?.identifierValue

    const phoneKeys = whatsappPhoneLookupKeys(channelIdentifier)

    let phoneNumber: { phone_number_id?: string } | undefined
    for (const phoneKey of phoneKeys) {
      const phoneNumbers = await instance.list('whatsapp_phone_number', {
        filter: { phone: phoneKey },
        limit: 1,
      })
      if (phoneNumbers.data.length > 0) {
        phoneNumber = phoneNumbers.data[0] as { phone_number_id?: string }
        break
      }
    }

    if (!phoneNumber) {
      return createNotFoundError('WhatsApp phone number', channelIdentifier)
    }

    const phoneNumberId = phoneNumber.phone_number_id
    if (!phoneNumberId) {
      return createValidationError(
        `WhatsApp phone number instance missing phone_number_id: ${channelIdentifier}`,
      )
    }

    const rawRecipient = groupId ?? input.subscription?.identifierValue
    const recipient = groupId
      ? rawRecipient
      : rawRecipient
        ? phoneDigits(rawRecipient)
        : ''
    if (!recipient) {
      return createValidationError('Missing recipient or group ID for WhatsApp send')
    }

    const client = new MetaClient(META_APP_ID, META_APP_SECRET, GRAPH_API_VERSION)

    const template = input.message.template
    if (template && groupId) {
      return createValidationError('WhatsApp templates can only be sent to one person, not a group')
    }

    try {
      // Outside the 24h window the platform sends an approved template instead of text.
      const result = template
        ? await client.sendWhatsAppTemplate(
            phoneNumberId,
            recipient,
            {
              name: template.name,
              language: template.language,
              parameters: template.parameters,
            },
            META_ACCESS_TOKEN,
          )
        : await client.sendWhatsAppMessage(
            phoneNumberId,
            recipient,
            input.message.content,
            META_ACCESS_TOKEN,
            groupId ? { recipientType: 'group' } : { recipientType: 'individual' },
          )

      return createSuccessResponse(
        {
          status: 'sent',
          remoteId: result.messages[0]?.id || '',
        },
        { billing: { credits: 1 } },
      )
    } catch (error) {
      if (error instanceof MetaWindowClosedError) {
        return createSuccessResponse<MessageSendOutput>({
          status: 'failed',
          failureCode: 'window_closed',
          failureReason: WINDOW_CLOSED_FAILURE_REASON,
        })
      }
      if (error instanceof AppAuthInvalidError) {
        throw error
      }
      throw error
    }
  },
}
