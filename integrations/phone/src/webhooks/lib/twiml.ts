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

export const TWILIO_CALLBACK_OK: WebhookResponse = {
  status: 200,
  headers: { 'Content-Type': 'text/plain' },
  body: 'OK',
}
