import skedyul, { isRuntimeContext } from 'skedyul'
import type { ToolDefinition } from 'skedyul'
import {
  MessageSendInputSchema,
  MessageSendOutputSchema,
  type MessageSendInput,
  type MessageSendOutput,
} from 'skedyul'
import { createEmailProvider, type EmailEnv, type EmailAttachment } from '../lib/email_provider'
import { createSuccessResponse, createEmailError } from '../lib/response'

/**
 * Fetch attachment content from a URL.
 */
async function fetchAttachmentContent(url: string): Promise<Buffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch attachment: ${response.status} ${response.statusText}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

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
  label: 'Send Email',
  description: 'Send an email message',
  inputSchema: MessageSendInputSchema,
  outputSchema: MessageSendOutputSchema,
  handler: async (input, context) => {
    // This is a runtime-only tool (message sending)
    if (!isRuntimeContext(context)) {
      throw new Error('send_email can only be called in a runtime context')
    }

    const env = context.env as EmailEnv

    // Log environment configuration (mask sensitive values)
    context.log('[send_email] Environment configuration:', {
      EMAIL_PROVIDER: env.EMAIL_PROVIDER ?? '(not set, defaulting to mailgun)',
      MAILGUN_DOMAIN: env.MAILGUN_DOMAIN ?? '(not set)',
      MAILGUN_API_KEY: env.MAILGUN_API_KEY ? `${env.MAILGUN_API_KEY.slice(0, 8)}...` : '(not set)',
      MAILGUN_SIGNING_SECRET: env.MAILGUN_SIGNING_SECRET ? '(set)' : '(not set)',
    })

    context.log('[send_email] Context:', {
      appInstallationId: context.appInstallationId,
      workplace: context.workplace.subdomain,
      envKeys: Object.keys(env),
    })

    const provider = createEmailProvider(env, context.log)
    context.log('[send_email] Provider created:', provider.name)

    const fallbackFromEmail = `${context.workplace.subdomain}@skedyul.app`
    const fromEmail = input.channel.identifierValue?.trim() || fallbackFromEmail

    // Support both old (subscription) and new (recipient) field formats
    const toEmail = input.recipient?.address ?? input.subscription?.identifierValue
    if (!toEmail) {
      return createEmailError('No recipient email address provided (expected recipient.address or subscription.identifierValue)')
    }

    // Fetch attachment content from URLs
    let emailAttachments: EmailAttachment[] | undefined
    if (input.message.attachments && input.message.attachments.length > 0) {
      context.log('[send_email] Fetching attachments:', input.message.attachments.length)
      
      emailAttachments = await Promise.all(
        input.message.attachments.map(async (att) => {
          if (!att.url) {
            context.log.error('[send_email] Attachment missing URL:', att.filename)
            throw new Error(`Attachment ${att.filename} has no URL`)
          }
          
          context.log('[send_email] Fetching attachment:', {
            filename: att.filename,
            mimeType: att.mimeType,
            size: att.size,
          })
          
          const content = await fetchAttachmentContent(att.url)
          return {
            filename: att.filename,
            content,
            contentType: att.mimeType,
          }
        })
      )
      
      context.log('[send_email] Fetched all attachments successfully')
    }

    const emailParams = {
      from: fromEmail,
      to: toEmail,
      subject: input.message.title ?? 'No Subject',
      text: input.message.content,
      html: input.message.contentRaw,
      attachments: emailAttachments,
    }

    context.log('[send_email] Sending email with params:', {
      from: emailParams.from,
      to: emailParams.to,
      subject: emailParams.subject,
      textLength: emailParams.text?.length ?? 0,
      htmlLength: emailParams.html?.length ?? 0,
      attachmentCount: emailParams.attachments?.length ?? 0,
    })

    try {
      const result = await provider.send(emailParams)

      context.log('[send_email] Email sent successfully:', {
        messageId: result.messageId,
        provider: result.provider,
      })

      return createSuccessResponse(
        {
          status: 'sent',
          remoteId: result.messageId,
        },
        { billing: { credits: 1 } },
      )
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

      context.log.error('[send_email] Failed to send email via Mailgun', {
        ...errorDetails,
        emailParams: {
          from: emailParams.from,
          to: emailParams.to,
          subject: emailParams.subject,
        },
        channel: input.channel.identifierValue,
        recipient: input.recipient?.address ?? input.subscription?.identifierValue,
        messageId: input.message.id,
        appInstallationId: context.appInstallationId,
        workplace: context.workplace.subdomain,
        env: {
          MAILGUN_DOMAIN: env.MAILGUN_DOMAIN ?? '(not set)',
        },
      })

      return createEmailError(errorMessage)
    }
  },
}
