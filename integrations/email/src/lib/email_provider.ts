/**
 * Email Provider Interface
 * ========================
 *
 * Abstraction layer for email providers. Allows swapping between
 * Mailgun, Resend, SendGrid, SES, etc. without changing app logic.
 *
 * The active provider is selected via the EMAIL_PROVIDER env var.
 */

import type { WebhookRequest } from 'skedyul'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type EmailAttachment = {
  filename: string
  content: Buffer | string
  contentType: string
}

export type SendEmailParams = {
  from: string
  fromName?: string
  to: string
  subject: string
  text?: string
  html?: string
  attachments?: EmailAttachment[]
  replyTo?: string
  /** Custom headers */
  headers?: Record<string, string>
}

export type SendEmailResult = {
  messageId: string
  provider: string
}

export type InboundAttachment = {
  name: string
  contentType: string
  size: number
  url: string
}

export type InboundEmail = {
  from: string
  to: string
  subject: string
  textBody: string
  htmlBody?: string
  messageId: string
  timestamp: Date
  attachments: InboundAttachment[]
  /** Raw headers from the email */
  headers?: Record<string, string>
}

export type EmailEnv = {
  EMAIL_PROVIDER?: string
  MAILGUN_API_KEY?: string
  MAILGUN_DOMAIN?: string
  MAILGUN_SIGNING_SECRET?: string
  MAILGUN_API_URL?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface EmailProvider {
  /** Provider identifier */
  readonly name: string

  /**
   * Send an email.
   */
  send(params: SendEmailParams): Promise<SendEmailResult>

  /**
   * Verify that an incoming webhook request is authentic.
   * Returns true if the signature is valid.
   */
  verifyWebhook(
    request: WebhookRequest,
    signingSecret: string,
  ): Promise<boolean>

  /**
   * Parse an inbound email webhook into a normalized format.
   */
  parseInboundEmail(request: WebhookRequest): Promise<InboundEmail>

  /**
   * Fetch attachment content from a URL (some providers require auth).
   */
  fetchAttachment(url: string): Promise<Buffer>
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider Factory
// ─────────────────────────────────────────────────────────────────────────────

import { MailgunProvider } from './providers/mailgun'

export type SupportedProvider = 'mailgun'

/**
 * Create an email provider instance based on environment configuration.
 */
export function createEmailProvider(env: EmailEnv): EmailProvider {
  const providerName = (env.EMAIL_PROVIDER ?? 'mailgun') as SupportedProvider

  switch (providerName) {
    case 'mailgun':
      return new MailgunProvider(env)
    // Future providers:
    // case 'resend':
    //   return new ResendProvider(env)
    // case 'sendgrid':
    //   return new SendGridProvider(env)
    // case 'ses':
    //   return new SESProvider(env)
    default:
      throw new Error(`Unknown email provider: ${providerName}`)
  }
}
