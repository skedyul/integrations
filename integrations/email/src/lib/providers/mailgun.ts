/**
 * Mailgun Provider Implementation
 * ================================
 *
 * Implements the EmailProvider interface using the mailgun.js library.
 *
 * @see https://www.npmjs.com/package/mailgun.js
 */

import crypto from 'crypto'
import Mailgun from 'mailgun.js'
import formData from 'form-data'
import type { WebhookRequest, ContextLogger } from 'skedyul'
import { AppAuthInvalidError } from 'skedyul'
import type {
  EmailProvider,
  EmailEnv,
  SendEmailParams,
  SendEmailResult,
  InboundEmail,
} from '../email_provider'
import {
  fetchMailgunAttachment,
  parseMailgunAttachments,
  parseMailgunFormBody,
} from './mailgun_inbound'

// ─────────────────────────────────────────────────────────────────────────────
// Mailgun Provider
// ─────────────────────────────────────────────────────────────────────────────

export class MailgunProvider implements EmailProvider {
  readonly name = 'mailgun'

  private readonly apiKey: string
  private readonly client: ReturnType<Mailgun['client']>
  private readonly domain: string
  private readonly log: ContextLogger

  constructor(env: EmailEnv, log: ContextLogger) {
    this.log = log

    if (!env.MAILGUN_API_KEY) {
      throw new Error('MAILGUN_API_KEY is required')
    }
    if (!env.MAILGUN_DOMAIN) {
      throw new Error('MAILGUN_DOMAIN is required')
    }

    this.domain = env.MAILGUN_DOMAIN
    this.apiKey = env.MAILGUN_API_KEY

    this.log('[MailgunProvider] Initializing with domain:', this.domain)

    // Follow npm docs exactly: https://www.npmjs.com/package/mailgun.js
    const mailgun = new Mailgun(formData)

    // Use default Mailgun API URL (no url param needed)
    this.client = mailgun.client({
      username: 'api',
      key: env.MAILGUN_API_KEY,
    })

    this.log('[MailgunProvider] Client initialized successfully')
  }

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    const fromAddress = params.fromName
      ? `${params.fromName} <${params.from}>`
      : params.from

    // Per npm docs, 'to' should be an array: https://www.npmjs.com/package/mailgun.js
    const toArray = Array.isArray(params.to) ? params.to : [params.to]

    this.log('[MailgunProvider] Sending email:', {
      domain: this.domain,
      from: fromAddress,
      to: toArray,
      subject: params.subject,
      attachmentCount: params.attachments?.length ?? 0,
    })

    // Build message data per mailgun.js docs
    const messageData: Record<string, unknown> = {
      from: fromAddress,
      to: toArray,
      subject: params.subject,
    }

    // Only include text/html if they have values
    if (params.text) {
      messageData.text = params.text
    }
    if (params.html) {
      messageData.html = params.html
    }

    // Add attachments if present
    // mailgun.js expects attachments as array of { filename, data } objects
    if (params.attachments && params.attachments.length > 0) {
      messageData.attachment = params.attachments.map((att) => ({
        filename: att.filename,
        data: att.content,
        contentType: att.contentType,
      }))
      this.log('[MailgunProvider] Including attachments:', params.attachments.map(a => ({
        filename: a.filename,
        contentType: a.contentType,
        size: Buffer.isBuffer(a.content) ? a.content.length : a.content.length,
      })))
    }

    this.log('[MailgunProvider] Message data:', JSON.stringify({
      ...messageData,
      attachment: messageData.attachment ? `[${(messageData.attachment as unknown[]).length} attachments]` : undefined,
    }, null, 2))

    try {
      const response = await this.client.messages.create(this.domain, messageData as {
        from: string
        to: string | string[]
        subject: string
        text?: string
        html?: string
        attachment?: Array<{ filename: string; data: Buffer | string; contentType?: string }>
      })

      this.log('[MailgunProvider] Mailgun response:', JSON.stringify(response, null, 2))

      return {
        messageId: response.id,
        provider: this.name,
      }
    } catch (error) {
      this.log.error('[MailgunProvider] Mailgun API error:', error)

      // Intercept 401/403 as auth invalid — API key is expired or revoked
      if (error && typeof error === 'object') {
        const errObj = error as Record<string, unknown>
        const status = (errObj.status ?? errObj.statusCode) as number | undefined
        if (status === 401 || status === 403) {
          throw new AppAuthInvalidError(
            `Mailgun API authentication failed (${status}). Please re-authorize the app.`,
          )
        }

        this.log.error('[MailgunProvider] Error details:', {
          message: errObj.message,
          status: errObj.status,
          statusCode: errObj.statusCode,
          details: errObj.details,
          type: errObj.type,
          body: errObj.body,
          response: errObj.response,
        })
      }

      throw error
    }
  }

  async verifyWebhook(
    request: WebhookRequest,
    signingSecret: string,
  ): Promise<boolean> {
    const body = parseMailgunFormBody(request.body)

    const token = body.token as string | undefined
    const timestamp = body.timestamp as string | undefined
    const signature = body.signature as string | undefined

    if (!token || !timestamp || !signature) {
      return false
    }

    const message = `${timestamp}${token}`
    const computedSignature = crypto
      .createHmac('sha256', signingSecret)
      .update(message)
      .digest('hex')

    return computedSignature === signature
  }

  async parseInboundEmail(request: WebhookRequest): Promise<InboundEmail> {
    const body = parseMailgunFormBody(request.body)
    const attachments = parseMailgunAttachments(body.attachments)

    return {
      from: (body.sender ?? body.from) as string,
      to: (body.recipient ?? body.to) as string,
      subject: body.subject as string,
      textBody: (body['body-plain'] ?? '') as string,
      htmlBody: body['body-html'] as string | undefined,
      messageId: (body['Message-Id'] ?? '') as string,
      timestamp: new Date(Number(body.timestamp) * 1000),
      attachments,
    }
  }

  async fetchAttachment(url: string): Promise<Buffer> {
    // Storage URLs always require the Mailgun API key. The previous
    // unauthenticated probe wasted time (and could hang) inside the
    // platform webhook HTTP budget.
    return fetchMailgunAttachment(url, this.apiKey)
  }
}
