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
import { APP_RING_SECONDS, parseCallRecipients } from '../lib/outbound_voice'
import {
  buildDialTwiml,
  buildRingAppsTwiml,
  ensureHttpsWebhookUrl,
  twimlError,
  twimlResponse,
} from './lib/twiml'

/** for an inbound webhook request and return the
 * parsed form/query params, or a TwiML error response on failure.
 */
export function validateAndParse(
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
    return { error: twimlError('Unauthorized request.') }
  }

  const authToken = context.env.TWILIO_AUTH_TOKEN
  if (!authToken) {
    return { error: twimlError('This number is temporarily unavailable.') }
  }

  let webhookUrl = request.url
  if (!webhookUrl) {
    return { error: twimlError('Invalid request.') }
  }
  const ngrokUrl = context.env.NGROK_DEVELOPER_URL
  if (ngrokUrl) {
    try {
      const parsed = new URL(webhookUrl)
      parsed.hostname = ngrokUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '')
      if (parsed.protocol === 'http:') {
        parsed.protocol = 'https:'
      }
      webhookUrl = parsed.toString()
    } catch {
      // keep original
    }
  } else if (webhookUrl.includes('.ngrok.') && webhookUrl.startsWith('http://')) {
    webhookUrl = ensureHttpsWebhookUrl(webhookUrl)
  }

  const valid = twilio.validateRequest(
    authToken,
    signature,
    webhookUrl,
    isGet ? {} : params,
  )
  if (!valid) {
    return { error: twimlError('Unauthorized request.') }
  }

  return { params }
}

async function registerCallWebhooks(
  callSessionId: string,
): Promise<{ transcriptionCallbackUrl?: string; statusCallbackUrl?: string }> {
  const [tc, st] = await Promise.all([
    webhook.create('call_transcription', { callSessionId }),
    webhook.create('call_status', { callSessionId }),
  ])
  return {
    transcriptionCallbackUrl: tc.url,
    statusCallbackUrl: st.url,
  }
}

async function endCallSession(callSessionId: string, reason: string): Promise<void> {
  try {
    await call.end({
      callSessionId,
      status: 'FAILED',
      externalStatus: reason,
    })
  } catch (err) {
    console.error('[receiveCall] Failed to end call session', callSessionId, err)
  }
}

/**
 * Handle an inbound voice call from Twilio.
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
    return twimlError('Invalid request.')
  }

  const searchResult = await instance.list('phone_number', {
    filter: { phone: { eq: to } },
    limit: 1,
  })
  const phoneRecord = searchResult.data[0] as unknown as
    | {
        forwarding_phone_number?: string | null
        phone: string
        name?: string | null
        app_call_recipients?: string | null
        inbound_call_route?: string | null
      }
    | undefined

  // A number set to ring the team rings everyone whose Skedyul app has
  // registered for calls; the forwarding number is then only the fallback.
  // A number set to forward never rings the app.
  const appIdentities =
    phoneRecord?.inbound_call_route === 'app'
      ? parseCallRecipients(phoneRecord.app_call_recipients)
      : []

  if (
    !phoneRecord ||
    (!phoneRecord.forwarding_phone_number && appIdentities.length === 0)
  ) {
    console.log('[receiveCall] No forwarding number configured for', to)
    return twimlError('This number is not configured to receive calls.')
  }

  const forwarding = phoneRecord.forwarding_phone_number ?? undefined
  const transcriptionEngine = context.env.TRANSCRIPTION_ENGINE || 'deepgram'

  let callSessionId: string | undefined
  let threadId: string | undefined
  let channelName: string | undefined
  let communicationChannelId: string | undefined
  let transcriptionCallbackUrl: string | undefined
  let statusCallbackUrl: string | undefined

  try {
    const channels = await communicationChannel.list({
      filter: { identifierValue: to },
      limit: 1,
    })
    const channel = channels[0]
    if (!channel) {
      console.log('[receiveCall] No communication channel for', to, '- forwarding without transcription')
    } else {
      const started = await call.start({
        communicationChannelId: channel.id,
        fromNumber: from,
        toNumber: to,
        ...(forwarding ? { forwardedToNumber: forwarding } : {}),
        direction: 'INBOUND',
        externalId: callSid,
        externalStatus: callStatus,
        transcriptionEngine,
      })
      callSessionId = started.callSessionId
      threadId = started.threadId
      communicationChannelId = channel.id
      channelName = (channel as { name?: string | null }).name ?? undefined

      try {
        const callbacks = await registerCallWebhooks(callSessionId)
        transcriptionCallbackUrl = callbacks.transcriptionCallbackUrl
        statusCallbackUrl = callbacks.statusCallbackUrl
      } catch (webhookErr) {
        console.error('[receiveCall] Failed to register per-call webhooks, forwarding without transcription:', webhookErr)
        transcriptionCallbackUrl = undefined
        statusCallbackUrl = undefined
      }
    }
  } catch (err) {
    console.error('[receiveCall] Failed to set up call session:', err)
    if (callSessionId) {
      await endCallSession(callSessionId, 'setup_error')
    }
    return twimlError('We are sorry, an error occurred. Please try again later.')
  }

  // Ring the app first. When that ringing ends, `call_fallback` decides:
  // answered → the call is over; unanswered → on to the forwarding number.
  if (appIdentities.length > 0) {
    try {
      const fallback = await webhook.create('call_fallback', {
        ...(callSessionId ? { callSessionId } : {}),
        ...(forwarding ? { forwardingNumber: forwarding } : {}),
        callerId: phoneRecord.phone,
      })
      return twimlResponse(
        buildRingAppsTwiml({
          callerId: from || phoneRecord.phone,
          identities: appIdentities,
          parameters: {
            CallerName: from,
            LineName: phoneRecord.name || channelName || phoneRecord.phone,
            ...(threadId ? { ThreadId: threadId } : {}),
            ...(communicationChannelId ? { ChannelId: communicationChannelId } : {}),
          },
          actionUrl: fallback.url,
          timeoutSeconds: APP_RING_SECONDS,
          transcriptionCallbackUrl,
          transcriptionEngine,
          transcriptionName: callSessionId ?? callSid ?? `call-${Date.now()}`,
        }),
      )
    } catch (err) {
      // Could not set up the app leg: carry on to forwarding if there is
      // somewhere to forward to.
      console.error('[receiveCall] Failed to ring the app:', err)
      if (!forwarding) {
        if (callSessionId) await endCallSession(callSessionId, 'app_ring_error')
        return twimlError('We are sorry, an error occurred. Please try again later.')
      }
    }
  }

  if (!forwarding) {
    if (callSessionId) await endCallSession(callSessionId, 'not_configured')
    return twimlError('This number is not configured to receive calls.')
  }

  try {
    const twiml = buildDialTwiml({
      callerId: phoneRecord.phone,
      forwardingNumber: forwarding,
      transcriptionCallbackUrl,
      statusCallbackUrl,
      transcriptionEngine,
      transcriptionName: callSessionId ?? callSid,
    })
    return twimlResponse(twiml)
  } catch (err) {
    console.error('[receiveCall] Failed to build TwiML:', err)
    if (callSessionId) {
      await endCallSession(callSessionId, 'twiml_error')
    }
    return twimlError('We are sorry, an error occurred. Please try again later.')
  }
}

export const receiveCallRegistry: WebhookDefinition = {
  name: 'receive_call',
  description:
    'Forward inbound voice calls and start Twilio Real-Time Transcription on both tracks',
  // Twilio inbound voice is configured as POST (update_forwarding_number).
  // GET remains accepted so numbers not yet resaved still validate.
  methods: ['GET', 'POST'],
  type: 'CALLBACK',
  handler: handleReceiveCall,
}
