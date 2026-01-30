/**
 * Type declarations for mailgun.js
 * https://www.npmjs.com/package/mailgun.js
 */

declare module 'mailgun.js' {
  import type FormData from 'form-data'

  interface MessagesSendResult {
    id: string
    message: string
  }

  interface MessagesClient {
    create(
      domain: string,
      data: {
        from: string
        to: string | string[]
        subject: string
        text?: string
        html?: string
        [key: string]: unknown
      },
    ): Promise<MessagesSendResult>
  }

  interface MailgunClient {
    messages: MessagesClient
  }

  interface MailgunClientOptions {
    username: string
    key: string
    url?: string
  }

  class Mailgun {
    constructor(formData: typeof FormData)
    client(options: MailgunClientOptions): MailgunClient
  }

  export = Mailgun
}
