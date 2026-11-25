/**
 * Classify Meta Graph API send errors.
 *
 * - `auth`: the token is invalid or expired; the platform asks for a reconnect.
 * - `window_closed`: the 24-hour customer service window is closed. Not an
 *   auth problem: WhatsApp needs a template, Messenger/Instagram can't send.
 * - `other`: anything else.
 */

export type MetaGraphError = {
  message?: string
  type?: string
  code?: number
  error_subcode?: number
}

export type MetaSendErrorKind = 'auth' | 'window_closed' | 'other'

/** WhatsApp: "Re-engagement message" — more than 24h since the customer replied. */
const WHATSAPP_REENGAGEMENT = 131047
/** Messenger: (#10) outside the allowed messaging window. */
const MESSENGER_OUTSIDE_WINDOW = 2018278
/** Instagram: (#10) outside the allowed messaging window. */
const INSTAGRAM_OUTSIDE_WINDOW = 2534022

const OUTSIDE_WINDOW_TEXT = /outside (of )?(the )?allowed window|re-?engagement message|more than 24 hours/i

export function classifyMetaSendError(error: MetaGraphError | undefined): MetaSendErrorKind {
  if (!error) return 'other'

  if (
    error.code === WHATSAPP_REENGAGEMENT ||
    error.error_subcode === MESSENGER_OUTSIDE_WINDOW ||
    error.error_subcode === INSTAGRAM_OUTSIDE_WINDOW ||
    (error.code === 10 && OUTSIDE_WINDOW_TEXT.test(error.message ?? ''))
  ) {
    return 'window_closed'
  }

  if (error.code === 190 || error.code === 102) return 'auth'
  // Permission errors can mean the token lost access.
  if (error.code === 10 && error.type === 'OAuthException') return 'auth'

  return 'other'
}

/** Thrown by send calls when the messaging window is closed. */
export class MetaWindowClosedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MetaWindowClosedError'
  }
}

export const WINDOW_CLOSED_FAILURE_REASON =
  "Not sent: the customer hasn't messaged in the last 24 hours."
