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
import {
  createSuccessResponse,
  createValidationError,
  createAuthError,
  createNotFoundError,
} from '../lib/response'

/**
 * Send an Instagram Direct message via Meta Graph API.
 */
export const sendInstagramRegistry: ToolDefinition<MessageSendInput, MessageSendOutput> = {
  name: 'send_instagram',
  label: 'Send Instagram',
  description: 'Send an Instagram Direct message via Meta Graph API',
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
      return createAuthError('META_APP_ID and META_APP_SECRET must be configured.')
    }

    if (!GRAPH_API_VERSION) {
      return createAuthError('GRAPH_API_VERSION must be configured.')
    }

    const instagramAccountId = input.channel.identifierValue
    const recipientIgsid = input.subscription?.identifierValue

    if (!recipientIgsid) {
      return createValidationError('Missing recipient IGSID for Instagram send')
    }

    const accounts = await instance.list('instagram_account', {
      filter: { instagram_account_id: instagramAccountId },
      limit: 1,
    })

    if (accounts.data.length === 0) {
      return createNotFoundError('Instagram account', instagramAccountId)
    }

    const client = new MetaClient(META_APP_ID, META_APP_SECRET, GRAPH_API_VERSION)

    try {
      const result = await client.sendInstagramMessage(
        instagramAccountId,
        META_ACCESS_TOKEN,
        recipientIgsid,
        input.message.content,
      )

      return createSuccessResponse(
        {
          status: 'sent',
          remoteId: result.message_id ?? '',
        },
        { billing: { credits: 1 } },
      )
    } catch (error) {
      if (error instanceof AppAuthInvalidError) {
        throw error
      }
      throw error
    }
  },
}
