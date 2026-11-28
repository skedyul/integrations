import type { WebhookResponse } from 'skedyul'

export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Twilio Real-Time Transcription requires HTTPS callback URLs.
 * Upgrade http ngrok/local URLs before embedding in TwiML.
 */
export function ensureHttpsWebhookUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (
      parsed.protocol === 'http:' &&
      (parsed.hostname.includes('ngrok') ||
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1')
    ) {
      parsed.protocol = 'https:'
      return parsed.toString()
    }
    return url
  } catch {
    return url.replace(/^http:\/\//i, 'https://')
  }
}

export function twimlResponse(body: string, status = 200): WebhookResponse {
  return {
    status,
    headers: { 'Content-Type': 'application/xml' },
    body,
  }
}

export function twimlError(message: string): WebhookResponse {
  return twimlResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Say>${xmlEscape(message)}</Say><Hangup/></Response>`,
  )
}

export type BuildDialTwimlInput = {
  callerId: string
  forwardingNumber: string
  transcriptionCallbackUrl?: string
  statusCallbackUrl?: string
  transcriptionEngine?: string
  transcriptionName?: string
}

export function buildDialTwiml(input: BuildDialTwimlInput): string {
  const transcriptionEngine = input.transcriptionEngine ?? 'deepgram'
  const transcriptionName =
    input.transcriptionName ?? `call-${Date.now()}`

  const transcriptionTwiml = input.transcriptionCallbackUrl
    ? `<Start><Transcription name="${xmlEscape(transcriptionName)}" statusCallbackUrl="${xmlEscape(ensureHttpsWebhookUrl(input.transcriptionCallbackUrl))}" track="both_tracks" inboundTrackLabel="caller" outboundTrackLabel="agent" transcriptionEngine="${xmlEscape(transcriptionEngine)}" partialResults="false"/></Start>`
    : ''

  const statusUrl = input.statusCallbackUrl
    ? ensureHttpsWebhookUrl(input.statusCallbackUrl)
    : undefined

  const numberTwiml = statusUrl
    ? `<Number statusCallback="${xmlEscape(statusUrl)}" statusCallbackEvent="completed" statusCallbackMethod="POST">${xmlEscape(input.forwardingNumber)}</Number>`
    : xmlEscape(input.forwardingNumber)

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${transcriptionTwiml}
  <Dial callerId="${xmlEscape(input.callerId)}">${numberTwiml}</Dial>
</Response>`
}

/**
 * Ring a customer's call through to team members' Skedyul apps. Everyone
 * listed rings at once and the first to answer takes it. When the ringing
 * ends, answered or not, Twilio asks `actionUrl` what to do next
 * (`call_fallback`): that is where an unanswered call goes on to the
 * forwarding number.
 *
 * `parameters` travel with the call to each app, so it can name the caller
 * and open their conversation.
 */
export function buildRingAppsTwiml(input: {
  /** The customer's number, shown as who is calling. */
  callerId: string
  identities: string[]
  parameters: Record<string, string>
  actionUrl: string
  timeoutSeconds: number
  transcriptionCallbackUrl?: string
  transcriptionEngine?: string
  transcriptionName: string
}): string {
  const transcriptionTwiml = input.transcriptionCallbackUrl
    ? `<Start><Transcription name="${xmlEscape(input.transcriptionName)}" statusCallbackUrl="${xmlEscape(ensureHttpsWebhookUrl(input.transcriptionCallbackUrl))}" track="both_tracks" inboundTrackLabel="caller" outboundTrackLabel="agent" transcriptionEngine="${xmlEscape(input.transcriptionEngine ?? 'deepgram')}" partialResults="false"/></Start>`
    : ''
  const parameterTwiml = Object.entries(input.parameters)
    .filter(([, value]) => value)
    .map(
      ([name, value]) =>
        `<Parameter name="${xmlEscape(name)}" value="${xmlEscape(value)}"/>`,
    )
    .join('')
  const clients = input.identities
    .map(
      (identity) =>
        `<Client><Identity>${xmlEscape(identity)}</Identity>${parameterTwiml}</Client>`,
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${transcriptionTwiml}
  <Dial callerId="${xmlEscape(input.callerId)}" timeout="${input.timeoutSeconds}" action="${xmlEscape(ensureHttpsWebhookUrl(input.actionUrl))}" method="POST">${clients}</Dial>
</Response>`
}

/** Nothing more to do with this call. */
export function twimlHangup(): WebhookResponse {
  return twimlResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`,
  )
}

/**
 * Dial the customer for a call a Skedyul client placed.
 *
 * Twilio names the tracks from its own side: `inbound_track` is what it
 * hears from whoever started the call. Here that is our team member, the
 * reverse of a forwarded incoming call, so the labels swap. The platform
 * always wants the customer on `inbound_track`; `call_transcription` swaps
 * the track for these calls (its registration says `direction: OUTBOUND`).
 *
 * `answerOnBridge` keeps the client hearing ringing until the customer
 * picks up, so "connected" on the client means answered.
 */
export function buildOutboundDialTwiml(input: {
  callerId: string
  toNumber: string
  transcriptionCallbackUrl?: string
  statusCallbackUrl?: string
  transcriptionEngine?: string
  transcriptionName: string
}): string {
  const transcriptionTwiml = input.transcriptionCallbackUrl
    ? `<Start><Transcription name="${xmlEscape(input.transcriptionName)}" statusCallbackUrl="${xmlEscape(ensureHttpsWebhookUrl(input.transcriptionCallbackUrl))}" track="both_tracks" inboundTrackLabel="agent" outboundTrackLabel="caller" transcriptionEngine="${xmlEscape(input.transcriptionEngine ?? 'deepgram')}" partialResults="false"/></Start>`
    : ''

  const statusUrl = input.statusCallbackUrl
    ? ensureHttpsWebhookUrl(input.statusCallbackUrl)
    : undefined

  const numberTwiml = statusUrl
    ? `<Number statusCallback="${xmlEscape(statusUrl)}" statusCallbackEvent="completed" statusCallbackMethod="POST">${xmlEscape(input.toNumber)}</Number>`
    : `<Number>${xmlEscape(input.toNumber)}</Number>`

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${transcriptionTwiml}
  <Dial callerId="${xmlEscape(input.callerId)}" answerOnBridge="true">${numberTwiml}</Dial>
</Response>`
}

export const TWILIO_CALLBACK_OK: WebhookResponse = {
  status: 200,
  headers: { 'Content-Type': 'text/plain' },
  body: 'OK',
}
