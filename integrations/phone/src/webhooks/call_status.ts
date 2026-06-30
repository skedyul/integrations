import { call } from 'skedyul'
import type {
  WebhookDefinition,
  WebhookRequest,
  WebhookResponse,
  WebhookContext,
} from 'skedyul'
import { URLSearchParams } from 'url'
import twilio from 'twilio'
import { getHeaderValue, serializeBody } from './lib/helpers'

const EMPTY_TWIML =
  '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'

const TERMINAL_STATUSES = new Set([
  'completed',
  'busy',
  'no-answer',
  'failed',
  'canceled',
  'cancelled',
])

function validate(
  request: WebhookRequest,
  context: WebhookContext,
): { params: Record<string, string> } | { error: WebhookResponse } {
  const params = Object.fromEntries(
    new URLSearchParams(serializeBody(request.body)).entries(),
  )
  const signature =
    getHeaderValue(request.headers, 'x-twilio-signature') ??
    getHeaderValue(request.headers, 'X-Twilio-Signature')
  const authToken = context.env.TWILIO_AUTH_TOKEN
  if (!signature || !authToken) {
    return { error: { status: 200, headers: { 'Content-Type': 'application/xml' }, body: EMPTY_TWIML } }
  }

  let webhookUrl = request.url ?? ''
  const ngrokUrl = context.env.NGROK_DEVELOPER_URL
  if (ngrokUrl && webhookUrl) {
    try {
      const parsed = new URL(webhookUrl)
      parsed.hostname = ngrokUrl
      webhookUrl = parsed.toString()
    } catch {
      // keep original
    }
  }

  const valid = twilio.validateRequest(authToken, signature, webhookUrl, params)
  if (!valid) {
    return { error: { status: 403, body: { error: 'Invalid Twilio signature' } } }
  }
  return { params }
}

function getCallSessionId(context: WebhookContext): string | undefined {
  const reg = (context as { registration?: Record<string, unknown> }).registration
  const value = reg?.callSessionId
  return typeof value === 'string' ? value : undefined
}

/**
 * Receive Twilio call/dial status callbacks. On a terminal status we close out
 * the CallSession with the final status and duration. The Core API maps the raw
 * Twilio status into the normalized CallStatus.
 */
async function handleCallStatus(
  request: WebhookRequest,
  context: WebhookContext,
): Promise<WebhookResponse> {
  const result = validate(request, context)
  if ('error' in result) return result.error
  const params = result.params

  const callSessionId = getCallSessionId(context)
  if (!callSessionId) {
    return { status: 200, headers: { 'Content-Type': 'application/xml' }, body: EMPTY_TWIML }
  }

  const rawStatus = (params.CallStatus ?? params.DialCallStatus ?? '').toLowerCase()
  const durationStr = params.CallDuration ?? params.DialCallDuration
  const duration = durationStr ? Number(durationStr) : undefined

  try {
    if (TERMINAL_STATUSES.has(rawStatus)) {
      await call.end({
        callSessionId,
        externalStatus: rawStatus,
        duration: Number.isFinite(duration) ? duration : undefined,
        recordingUrl: params.RecordingUrl ?? undefined,
        recordingSid: params.RecordingSid ?? undefined,
      })
    }
  } catch (err) {
    console.error('[callStatus] Failed to update call status:', err)
  }

  return { status: 200, headers: { 'Content-Type': 'application/xml' }, body: EMPTY_TWIML }
}

export const callStatusRegistry: WebhookDefinition = {
  name: 'call_status',
  description: 'Receive Twilio call/dial status callbacks and finalize the CallSession',
  methods: ['POST'],
  handler: handleCallStatus,
}
