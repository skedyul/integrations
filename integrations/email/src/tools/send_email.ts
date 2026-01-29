import skedyul from 'skedyul'
import type { ToolDefinition } from 'skedyul'
import {
  MessageSendInputSchema,
  MessageSendOutputSchema,
  type MessageSendInput,
  type MessageSendOutput,
} from 'skedyul'
import { createEmailProvider, type EmailEnv } from '../lib/email_provider'

const { z } = skedyul

/**
 * Send an email message.
 * Uses the standardized MessageSendInput/Output schemas for strict tool registry typing.
 *
 * Field mapping:
 * - message.title -> email subject
 * - message.content -> plain text body
 * - message.contentRaw -> HTML body (if present)
 */
export const sendEmailRegistry: ToolDefinition<MessageSendInput, MessageSendOutput> = {
  name: 'send_email',
  description: 'Send an email message',
  inputs: MessageSendInputSchema,
  outputSchema: MessageSendOutputSchema,
  handler: async (input, context) => {
    const provider = createEmailProvider(context.env as EmailEnv)

    const result = await provider.send({
      from: input.channel.identifierValue,
      to: input.subscription.identifierValue,
      subject: input.message.title ?? 'No Subject',
      text: input.message.content,
      html: input.message.contentRaw,
    })

    return {
      output: {
        status: 'sent',
        remoteId: result.messageId,
      },
      billing: {
        credits: 1,
      },
    }
  },
}
