import skedyul, { isRuntimeContext } from 'skedyul'
import type { ToolDefinition } from 'skedyul'
import {
  MessageSendInputSchema,
  MessageSendOutputSchema,
  type MessageSendInput,
  type MessageSendOutput,
} from 'skedyul'
import { createEmailProvider, type EmailEnv } from '../lib/email_provider'

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
    // This is a runtime-only tool (message sending)
    if (!isRuntimeContext(context)) {
      throw new Error('send_email can only be called in a runtime context')
    }

    const env = context.env as EmailEnv

    // Log environment configuration (mask sensitive values)
    console.log('[send_email] Environment configuration:', {
      EMAIL_PROVIDER: env.EMAIL_PROVIDER ?? '(not set, defaulting to mailgun)',
      MAILGUN_DOMAIN: env.MAILGUN_DOMAIN ?? '(not set)',
      MAILGUN_API_KEY: env.MAILGUN_API_KEY ? `${env.MAILGUN_API_KEY.slice(0, 8)}...` : '(not set)',
      MAILGUN_SIGNING_SECRET: env.MAILGUN_SIGNING_SECRET ? '(set)' : '(not set)',
    })

    console.log('[send_email] Context:', {
      appInstallationId: context.appInstallationId,
      workplace: context.workplace.subdomain,
      envKeys: Object.keys(env),
    })

    const provider = createEmailProvider(env)
    console.log('[send_email] Provider created:', provider.name)

    const fallbackFromEmail = `${context.workplace.subdomain}@skedyul.app`
    const fromEmail = input.channel.identifierValue?.trim() || fallbackFromEmail

    const emailParams = {
      from: fromEmail,
      to: input.subscription.identifierValue,
      subject: input.message.title ?? 'No Subject',
      text: input.message.content,
      html: input.message.contentRaw,
    }

    console.log('[send_email] Sending email with params:', {
      from: emailParams.from,
      to: emailParams.to,
      subject: emailParams.subject,
      textLength: emailParams.text?.length ?? 0,
      htmlLength: emailParams.html?.length ?? 0,
    })

    try {
      const result = await provider.send(emailParams)

      console.log('[send_email] Email sent successfully:', {
        messageId: result.messageId,
        provider: result.provider,
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

      // Log full error details including response if available
      let errorDetails: Record<string, unknown> = {
        error: errorMessage,
        stack: errorStack,
      }

      // Try to extract more details from Mailgun API error
      if (error && typeof error === 'object') {
        const errObj = error as Record<string, unknown>
        if ('status' in errObj) errorDetails.status = errObj.status
        if ('statusCode' in errObj) errorDetails.statusCode = errObj.statusCode
        if ('response' in errObj) errorDetails.response = errObj.response
        if ('body' in errObj) errorDetails.body = errObj.body
        if ('details' in errObj) errorDetails.details = errObj.details
      }

      console.error('[send_email] Failed to send email via Mailgun', {
        ...errorDetails,
        emailParams: {
          from: emailParams.from,
          to: emailParams.to,
          subject: emailParams.subject,
        },
        channel: input.channel.identifierValue,
        subscription: input.subscription.identifierValue,
        messageId: input.message.id,
        appInstallationId: context.appInstallationId,
        workplace: context.workplace.subdomain,
        env: {
          MAILGUN_DOMAIN: env.MAILGUN_DOMAIN ?? '(not set)',
        },
      })

      throw error
    }
  },
}
