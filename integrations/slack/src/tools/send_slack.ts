import type { ToolDefinition } from 'skedyul'
import {
  MessageSendInputSchema,
  MessageSendOutputSchema,
  type MessageSendInput,
  type MessageSendOutput,
} from 'skedyul'
import { SlackClient } from '../lib/slack_client'
import {
  createAuthError,
  createSuccessResponse,
  createValidationError,
  createExternalError,
} from '../lib/response'

export const sendSlackRegistry: ToolDefinition<MessageSendInput, MessageSendOutput> = {
  name: 'send_slack',
  label: 'Send Slack',
  description: 'Post a Slack message to a channel or direct message',
  inputSchema: MessageSendInputSchema,
  outputSchema: MessageSendOutputSchema,
  handler: async (input, context) => {
    const token = context.env.SLACK_BOT_TOKEN
    if (!token) {
      return createAuthError('SLACK_BOT_TOKEN is not configured. Complete the Slack OAuth install.')
    }

    const destination =
      input.group?.identifierValue ??
      input.subscription?.identifierValue ??
      input.recipient?.address

    if (!destination) {
      return createValidationError('Missing Slack channel or user id')
    }

    const client = new SlackClient(token)
    const result = await client.postMessage({
      channel: destination,
      text: input.message.content,
    })

    if (!result.ok) {
      return createExternalError('Slack', result.error || 'chat.postMessage failed')
    }

    return createSuccessResponse({
      status: 'sent',
      remoteId: result.ts,
    })
  },
}
