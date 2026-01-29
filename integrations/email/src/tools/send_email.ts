import skedyul, { type z as ZodType } from 'skedyul'
import type { ToolDefinition } from 'skedyul'
import { createEmailProvider, type EmailEnv } from '../lib/email_provider'

const { z } = skedyul

/**
 * Input schema for sending emails.
 * This tool can be invoked by agents, workflows, or page actions.
 */
const SendEmailInputSchema = z.object({
  to: z.string().email().describe('Recipient email address'),
  from: z.string().email().describe('Sender email address (must be a configured address)'),
  fromName: z.string().optional().describe('Display name for the sender'),
  subject: z.string().describe('Email subject line'),
  text: z.string().optional().describe('Plain text body'),
  html: z.string().optional().describe('HTML body'),
  replyTo: z.string().email().optional().describe('Reply-to address'),
})

const SendEmailOutputSchema = z.object({
  messageId: z.string().describe('Provider message ID'),
  provider: z.string().describe('Email provider used'),
})

type SendEmailInput = ZodType.infer<typeof SendEmailInputSchema>
type SendEmailOutput = ZodType.infer<typeof SendEmailOutputSchema>

export const sendEmailRegistry: ToolDefinition<SendEmailInput, SendEmailOutput> = {
  name: 'send_email',
  description: 'Send an email message',
  inputs: SendEmailInputSchema,
  outputSchema: SendEmailOutputSchema,
  handler: async (input, context) => {
    const provider = createEmailProvider(context.env as EmailEnv)

    const result = await provider.send({
      from: input.from,
      fromName: input.fromName,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      replyTo: input.replyTo,
    })

    return {
      output: {
        messageId: result.messageId,
        provider: result.provider,
      },
      billing: {
        credits: 1,
      },
    }
  },
}
