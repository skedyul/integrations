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

  // ─────────────────────────────────────────────────────────────────────────────
  // Routes Types
  // ─────────────────────────────────────────────────────────────────────────────

  interface Route {
    id: string
    priority: number
    description: string
    expression: string
    actions: string[]
    created_at: string
  }

  interface RoutesListResult {
    items: Route[]
    total_count: number
  }

  interface RouteCreateParams {
    priority: number
    description: string
    expression: string
    action: string[]
  }

  interface RouteUpdateParams {
    priority?: number
    description?: string
    expression?: string
    action?: string[]
  }

  interface RoutesClient {
    list(): Promise<RoutesListResult>
    get(routeId: string): Promise<Route>
    create(params: RouteCreateParams): Promise<Route>
    update(routeId: string, params: RouteUpdateParams): Promise<Route>
    destroy(routeId: string): Promise<{ message: string }>
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Client
  // ─────────────────────────────────────────────────────────────────────────────

  interface MailgunClient {
    messages: MessagesClient
    routes: RoutesClient
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
