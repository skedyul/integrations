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
 * Send a Facebook Messenger message via Meta Graph API.
 */
export const sendMessengerRegistry: ToolDefinition<MessageSendInput, MessageSendOutput> = {
  name: 'send_messenger',
  label: 'Send Messenger',
  description: 'Send a Facebook Messenger message via Meta Graph API',
  inputSchema: MessageSendInputSchema,
  outputSchema: MessageSendOutputSchema,
  handler: async (input, context) => {
    const META_APP_ID = context.env.META_APP_ID || process.env.META_APP_ID
    const META_APP_SECRET = context.env.META_APP_SECRET || process.env.META_APP_SECRET
    const GRAPH_API_VERSION = context.env.GRAPH_API_VERSION || process.env.GRAPH_API_VERSION

    if (!META_APP_ID || !META_APP_SECRET) {
      return createAuthError('META_APP_ID and META_APP_SECRET must be configured.')
    }

    if (!GRAPH_API_VERSION) {
      return createAuthError('GRAPH_API_VERSION must be configured.')
    }

    const pageId = input.channel.identifierValue
    const recipientPsid = input.subscription?.identifierValue

    if (!recipientPsid) {
      return createValidationError('Missing recipient PSID for Messenger send')
    }

    const pages = await instance.list('facebook_page', {
      filter: { page_id: pageId },
      limit: 1,
    })

    if (pages.data.length === 0) {
      return createNotFoundError('Facebook page', pageId)
    }

    const listedPage = pages.data[0] as { id: string }
    const page = await instance.get('facebook_page', listedPage.id, {
      includeEnv: true,
    })

    if (!page) {
      return createNotFoundError('Facebook page', pageId)
    }

    const pageAccessToken = page.env?.ACCESS_TOKEN
    if (!pageAccessToken) {
      return createValidationError(`Facebook page ${pageId} is missing ACCESS_TOKEN`)
    }

    const client = new MetaClient(META_APP_ID, META_APP_SECRET, GRAPH_API_VERSION)

    try {
      const result = await client.sendMessengerMessage(
        pageId,
        pageAccessToken,
        recipientPsid,
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
