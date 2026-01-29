/**
 * Mailgun Provider Implementation
 * ================================
 *
 * Implements the EmailProvider interface using the Mailgun API.
 *
 * @see https://documentation.mailgun.com/docs/mailgun/api-reference/
 */

import Mailgun from 'mailgun.js'
import FormData from 'form-data'
import crypto from 'crypto'
import type { WebhookRequest } from 'skedyul'
import type {
  EmailProvider,
  EmailEnv,
  SendEmailParams,
  SendEmailResult,
  InboundEmail,
  InboundAttachment,
} from '../email_provider'

// ─────────────────────────────────────────────────────────────────────────────
// Mailgun Provider
// ─────────────────────────────────────────────────────────────────────────────

export class MailgunProvider implements EmailProvider {
  readonly name = 'mailgun'

  private readonly apiKey: string
  private readonly domain: string
  private readonly apiUrl: string
  private readonly client: ReturnType<Mailgun['client']>

  constructor(env: EmailEnv) {
    if (!env.MAILGUN_API_KEY) {
      throw new Error('MAILGUN_API_KEY is required')
    }
    if (!env.MAILGUN_DOMAIN) {
      throw new Error('MAILGUN_DOMAIN is required')
    }

    this.apiKey = env.MAILGUN_API_KEY
    this.domain = env.MAILGUN_DOMAIN
    this.apiUrl = env.MAILGUN_API_URL ?? 'https://api.mailgun.net'

    const mailgun = new Mailgun(FormData)
    this.client = mailgun.client({
      username: 'api',
      key: this.apiKey,
      url: this.apiUrl,
    })
  }

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    const fromAddress = params.fromName
      ? `${params.fromName} <${params.from}>`
      : params.from

    const messageData: Record<string, unknown> = {
      from: fromAddress,
      to: params.to,
      subject: params.subject,
    }

    if (params.text) {
      messageData.text = params.text
    }
    if (params.html) {
      messageData.html = params.html
    }
    if (params.replyTo) {
      messageData['h:Reply-To'] = params.replyTo
    }
    if (params.headers) {
      for (const [key, value] of Object.entries(params.headers)) {
        messageData[`h:${key}`] = value
      }
    }

    // Handle attachments
    if (params.attachments && params.attachments.length > 0) {
      messageData.attachment = params.attachments.map((att) => ({
        filename: att.filename,
        data: typeof att.content === 'string' 
          ? Buffer.from(att.content) 
          : att.content,
        contentType: att.contentType,
      }))
    }

    const response = await this.client.messages.create(this.domain, messageData)

    return {
      messageId: response.id,
      provider: this.name,
    }
  }

  async verifyWebhook(
    request: WebhookRequest,
    signingSecret: string,
  ): Promise<boolean> {
    const body = this.parseFormBody(request.body)

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
    const body = this.parseFormBody(request.body)

    // Parse attachments JSON if present
    let attachments: InboundAttachment[] = []
    if (body.attachments) {
      try {
        const parsed = JSON.parse(body.attachments as string) as Array<{
          name: string
          'content-type': string
          size: number
          url: string
        }>
        attachments = parsed.map((att) => ({
          name: att.name,
          contentType: att['content-type'],
          size: att.size,
          url: att.url,
        }))
      } catch {
        // Ignore parse errors
      }
    }

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
    // Try without auth first (storage URLs might be public)
    let response = await fetch(url, { method: 'GET' })

    // If unauthorized, try with Basic Auth
    if (response.status === 401 || response.status === 404) {
      const authString = `api:${this.apiKey}`
      const authHeader = Buffer.from(authString, 'utf-8').toString('base64')

      response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${authHeader}`,
        },
      })
    }

    if (!response.ok) {
      throw new Error(
        `Failed to fetch attachment: ${response.status} ${response.statusText}`,
      )
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private Helpers
  // ─────────────────────────────────────────────────────────────────────────

  private parseFormBody(body: unknown): Record<string, unknown> {
    if (typeof body === 'string') {
      // URL-encoded form data
      const params = new URLSearchParams(body)
      const result: Record<string, unknown> = {}
      for (const [key, value] of params.entries()) {
        result[key] = value
      }
      return result
    }
    if (typeof body === 'object' && body !== null) {
      return body as Record<string, unknown>
    }
    return {}
  }
}
