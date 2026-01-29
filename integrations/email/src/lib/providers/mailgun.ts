/**
 * Mailgun Provider Implementation
 * ================================
 *
 * Implements the EmailProvider interface using the ts-mailgun library.
 *
 * @see https://www.npmjs.com/package/ts-mailgun
 */

import { NodeMailgun } from 'ts-mailgun'
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
  private readonly mailer: NodeMailgun

  constructor(env: EmailEnv) {
    if (!env.MAILGUN_API_KEY) {
      throw new Error('MAILGUN_API_KEY is required')
    }
    if (!env.MAILGUN_DOMAIN) {
      throw new Error('MAILGUN_DOMAIN is required')
    }

    this.apiKey = env.MAILGUN_API_KEY
    this.domain = env.MAILGUN_DOMAIN

    this.mailer = new NodeMailgun()
    this.mailer.apiKey = this.apiKey
    this.mailer.domain = this.domain

    this.mailer.init()
  }

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    // Configure from address for this send
    this.mailer.fromEmail = params.from
    this.mailer.fromTitle = params.fromName ?? ''

    // Determine the message content - prefer HTML if available
    const message = params.html ?? params.text ?? ''

    const response = await this.mailer.send(
      params.to,
      params.subject,
      message,
    )

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
