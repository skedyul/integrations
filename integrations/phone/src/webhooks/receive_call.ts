import { instance, communicationChannel, webhook, call } from 'skedyul'
import type {
  WebhookDefinition,
  WebhookRequest,
  WebhookResponse,
  WebhookContext,
} from 'skedyul'
import { URLSearchParams } from 'url'
import twilio from 'twilio'
import { getHeaderValue, serializeBody } from './lib/helpers'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Validate the Twilio signature for an inbound webhook request and return the
 * parsed form/query params, or a WebhookResponse to short-circuit on failure.
 */
function validateAndParse(
  request: WebhookRequest,
  context: WebhookContext,
): { params: Record<string, string> } | { error: WebhookResponse } {
  const isGet = request.method === 'GET'
  const params = isGet
    ? request.query ?? {}
    : Object.fromEntries(new URLSearchParams(serializeBody(request.body)).entries())

  const signature =
    getHeaderValue(request.headers, 'x-twilio-signature') ??
    getHeaderValue(request.headers, 'X-Twilio-Signature')
  if (!signature) {
    return { error: { status: 401, body: { error: 'Missing Twilio signature' } } }
  }

  const authToken = context.env.TWILIO_AUTH_TOKEN
  if (!authToken) {
    return { error: { status: 500, body: { error: 'TWILIO_AUTH_TOKEN is not configured' } } }
  }

  let webhookUrl = request.url
  if (!webhookUrl) {
    return { error: { status: 400, body: { error: 'Missing webhook URL' } } }
  }
  const ngrokUrl = context.env.NGROK_DEVELOPER_URL
  if (ngrokUrl) {
    try {
      const parsed = new URL(webhookUrl)
      parsed.hostname = ngrokUrl
      webhookUrl = parsed.toString()
    } catch {
      // keep original
    }
  }

  const valid = twilio.validateRequest(
    authToken,
    signature,
    webhookUrl,
    isGet ? {} : params,
  )
  if (!valid) {
    return { error: { status: 403, body: { error: 'Invalid Twilio signature' } } }
  }

  return { params }
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Handler
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle an inbound voice call from Twilio.
 *
 * 1. Validate the Twilio signature and look up the forwarding number.
 * 2. Create a CallSession + thread CALL block via the Core API (`call.start`).
 * 3. Register per-call transcription + status callback URLs (carrying the
 *    callSessionId in their registration context).
 * 4. Return TwiML that starts Twilio Real-Time Transcription on both tracks and
 *    dials the forwarding number, so the human-to-human call is transcribed live.
 */
async function handleReceiveCall(
  request: WebhookRequest,
  context: WebhookContext,
): Promise<WebhookResponse> {
  const result = validateAndParse(request, context)
  if ('error' in result) return result.error
  const params = result.params

  const to = params.To ?? params.Called ?? ''
  const from = params.From ?? params.Caller ?? ''
  const callSid = params.CallSid ?? undefined
  const callStatus = params.CallStatus ?? undefined

  if (!to) {
    return {
      status: 400,
      headers: { 'Content-Type': 'application/xml' },
      body: '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Invalid request</Say></Response>',
    }
  }

  // Look up the phone number record (cross-installation via sk_app_ token).
  const searchResult = await instance.list('phone_number', {
    filter: { phone: to },
    limit: 1,
  })
  const phoneRecord = searchResult.data[0] as unknown as
    | { forwarding_phone_number?: string | null; phone: string }
    | undefined

  if (!phoneRecord || !phoneRecord.forwarding_phone_number) {
    console.log('[receiveCall] No forwarding number configured for', to)
    return {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
      body: '<?xml version="1.0" encoding="UTF-8"?><Response><Say>This number is not configured to receive calls.</Say></Response>',
    }
  }

  const forwarding = phoneRecord.forwarding_phone_number
  const transcriptionEngine = context.env.TRANSCRIPTION_ENGINE || 'deepgram'

  // Resolve the communication channel for this Twilio number.
  let callSessionId: string | undefined
  let transcriptionCallbackUrl: string | undefined
  let statusCallbackUrl: string | undefined
  try {
    const channels = await communicationChannel.list({
      filter: { identifierValue: to },
      limit: 1,
    })
    const channel = channels[0]
    if (channel) {
      const started = await call.start({
        communicationChannelId: channel.id,
        fromNumber: from,
        toNumber: to,
        forwardedToNumber: forwarding,
        direction: 'INBOUND',
        externalId: callSid,
        externalStatus: callStatus,
        transcriptionEngine,
      })
      callSessionId = started.callSessionId

      // Per-call callbacks carry the callSessionId in their registration context.
      const [tc, st] = await Promise.all([
        webhook.create('call_transcription', { callSessionId }),
        webhook.create('call_status', { callSessionId }),
      ])
      transcriptionCallbackUrl = tc.url
      statusCallbackUrl = st.url
    } else {
      console.log('[receiveCall] No communication channel for', to, '- forwarding without transcription')
    }
  } catch (err) {
    // Never fail the call if transcription setup fails; fall back to plain forwarding.
    console.error('[receiveCall] Failed to set up transcription:', err)
  }

  // Build TwiML. Start real-time transcription on both tracks (when configured),
  // then dial the forwarding number.
  const transcriptionTwiml = transcriptionCallbackUrl
    ? `<Start><Transcription statusCallbackUrl="${xmlEscape(transcriptionCallbackUrl)}" track="both_tracks" inboundTrackLabel="caller" outboundTrackLabel="agent" transcriptionEngine="${xmlEscape(transcriptionEngine)}" partialResults="false"/></Start>`
    : ''

  const numberTwiml = statusCallbackUrl
    ? `<Number statusCallback="${xmlEscape(statusCallbackUrl)}" statusCallbackEvent="completed" statusCallbackMethod="POST">${xmlEscape(forwarding)}</Number>`
    : xmlEscape(forwarding)

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${transcriptionTwiml}
  <Dial callerId="${xmlEscape(phoneRecord.phone)}">${numberTwiml}</Dial>
</Response>`

  return {
    status: 200,
    headers: { 'Content-Type': 'application/xml' },
    body: twiml,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Registry Export
// ─────────────────────────────────────────────────────────────────────────────

export const receiveCallRegistry: WebhookDefinition = {
  name: 'receive_call',
  description:
    'Forward inbound voice calls and start Twilio Real-Time Transcription on both tracks',
  methods: ['GET', 'POST'],
  type: 'CALLBACK', // Must return TwiML to Twilio
  handler: handleReceiveCall,
}
