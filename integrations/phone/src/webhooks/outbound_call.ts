import { instance, communicationChannel, webhook, call } from 'skedyul'
import type {
  WebhookDefinition,
  WebhookRequest,
  WebhookResponse,
  WebhookContext,
} from 'skedyul'
import { dialableNumber } from '../lib/outbound_voice'
import { validateAndParse } from './receive_call'
import { buildOutboundDialTwiml, twimlError, twimlResponse } from './lib/twiml'

type PhoneRecord = {
  phone: string
  outbound_voice_enabled?: boolean | null
}

/**
 * A Skedyul client has connected to place a call. Twilio asks what to do
 * with it; we answer by dialling the customer from the workplace's number.
 *
 * The request carries what the client was told to send by `make_call`:
 * `To`, `ChannelId`, and who is calling. It is trusted only as far as
 * Twilio's signature goes (it came from a client holding one of our
 * tokens), so the channel and its outgoing-calls switch are checked again
 * here.
 */
async function handleOutboundCall(
  request: WebhookRequest,
  context: WebhookContext,
): Promise<WebhookResponse> {
  const result = validateAndParse(request, context)
  if ('error' in result) return result.error
  const params = result.params

  const toNumber = dialableNumber(params.To)
  const channelId = params.ChannelId
  if (!toNumber || !channelId) {
    return twimlError('This call could not be placed.')
  }

  let callerId: string
  try {
    const channel = await communicationChannel.get(channelId)
    const lineNumber = channel?.identifierValue
    if (!lineNumber) {
      return twimlError('This call could not be placed.')
    }
    const found = await instance.list('phone_number', {
      filter: { phone: { eq: lineNumber } },
      limit: 1,
    })
    const phoneRecord = found.data[0] as unknown as PhoneRecord | undefined
    if (!phoneRecord || phoneRecord.outbound_voice_enabled !== true) {
      return twimlError('Outgoing calls are turned off for this number.')
    }
    callerId = phoneRecord.phone
  } catch (err) {
    console.error('[outboundCall] Failed to resolve the calling line:', err)
    return twimlError('We are sorry, an error occurred. Please try again later.')
  }

  const transcriptionEngine = context.env.TRANSCRIPTION_ENGINE || 'deepgram'
  let callSessionId: string | undefined
  let transcriptionCallbackUrl: string | undefined
  let statusCallbackUrl: string | undefined

  try {
    const started = await call.start({
      communicationChannelId: channelId,
      fromNumber: callerId,
      toNumber,
      direction: 'OUTBOUND',
      externalId: params.CallSid ?? undefined,
      externalStatus: params.CallStatus ?? undefined,
      transcriptionEngine,
      agentName: params.AgentName || undefined,
      agentMemberId: params.MemberId || undefined,
    })
    callSessionId = started.callSessionId

    try {
      const [transcription, status] = await Promise.all([
        webhook.create('call_transcription', {
          callSessionId,
          direction: 'OUTBOUND',
        }),
        webhook.create('call_status', { callSessionId }),
      ])
      transcriptionCallbackUrl = transcription.url
      statusCallbackUrl = status.url
    } catch (webhookErr) {
      // The call still goes ahead; it just is not transcribed or closed out
      // by callback.
      console.error('[outboundCall] Failed to register per-call webhooks:', webhookErr)
    }
  } catch (err) {
    console.error('[outboundCall] Failed to start the call session:', err)
    return twimlError('We are sorry, an error occurred. Please try again later.')
  }

  return twimlResponse(
    buildOutboundDialTwiml({
      callerId,
      toNumber,
      transcriptionCallbackUrl,
      statusCallbackUrl,
      transcriptionEngine,
      transcriptionName: callSessionId ?? params.CallSid ?? `call-${Date.now()}`,
    }),
  )
}

export const outboundCallRegistry: WebhookDefinition = {
  name: 'outbound_call',
  description:
    'Answer a Skedyul client that is placing a call: dial the customer from the workplace number, with transcription',
  methods: ['POST'],
  type: 'CALLBACK',
  handler: handleOutboundCall,
}
