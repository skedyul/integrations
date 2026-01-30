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

    const fallbackFromEmail =
      context.workplace?.subdomain != null
        ? `${context.workplace.subdomain}@skedyul.app`
        : 'no-reply@skedyul.app'
    const fromEmail = input.channel.identifierValue?.trim() || fallbackFromEmail

    try {
      const result = await provider.send({
        from: fromEmail,
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
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : JSON.stringify(error, null, 2)
      const errorStack = error instanceof Error ? error.stack : undefined

      console.error('[send_email] Failed to send email via Mailgun', {
        error: errorMessage,
        stack: errorStack,
        channel: input.channel.identifierValue,
        subscription: input.subscription.identifierValue,
        messageId: input.message.id,
        appInstallationId: context.appInstallationId,
        workplace: context.workplace?.subdomain,
      })

      throw error
    }
  },
}
