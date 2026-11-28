/**
 * Calls placed from a Skedyul client (the phone app, later the browser)
 * through one of the workplace's numbers.
 *
 * The client's audio reaches Twilio over the internet, using a short-lived
 * access token minted by `make_call`. When the client connects, Twilio asks
 * the TwiML Application for instructions; that is our `outbound_call`
 * webhook, which dials the customer from the workplace's number.
 */

/** Who a client is, as Twilio sees it. Letters, digits and underscores only. */
export function voiceIdentity(memberId: string): string {
  const safe = memberId.replace(/[^A-Za-z0-9_]/g, '_').slice(0, 100)
  return `member_${safe || 'unknown'}`
}

/** One TwiML Application per installation, found again by this name. */
export function twimlAppName(appInstallationId: string): string {
  return `Skedyul calls ${appInstallationId}`.slice(0, 64)
}

/**
 * A number Twilio can dial: E.164, or digits a caller might have typed.
 * Returns it stripped of spacing, or null when it is not a phone number.
 */
export function dialableNumber(raw: string | null | undefined): string | null {
  if (!raw) return null
  const compact = raw.replace(/[\s().-]/g, '')
  return /^\+?\d{7,15}$/.test(compact) ? compact : null
}

/** How long app users are rung before a call falls back to forwarding. */
export const APP_RING_SECONDS = 20

/** A registration lasts a day; devices re-register when they come forward. */
export const LISTEN_TOKEN_TTL_SECONDS = 24 * 60 * 60

/**
 * Who a line rings in the app, as stored on its phone number record: member
 * ids separated by commas. Returned as Twilio client identities.
 */
export function parseCallRecipients(raw: unknown): string[] {
  if (typeof raw !== 'string') return []
  return [
    ...new Set(
      raw
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
        .map(voiceIdentity),
    ),
  ]
}

/** Member ids as they are stored on the phone number record. */
export function formatCallRecipients(memberIds: readonly string[]): string {
  return [...new Set(memberIds.map((id) => id.trim()).filter(Boolean))]
    .sort()
    .join(',')
}

/** How long a client has to connect after asking to call. */
export const VOICE_TOKEN_TTL_SECONDS = 600

export type OutboundDialTwimlInput = {
  /** The workplace's number, shown to the person being called. */
  callerId: string
  toNumber: string
  transcriptionCallbackUrl?: string
  statusCallbackUrl?: string
  transcriptionEngine?: string
  transcriptionName: string
}
