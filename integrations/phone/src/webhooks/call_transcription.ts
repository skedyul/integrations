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
import { TWILIO_CALLBACK_OK } from './lib/twiml'

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
    return { error: TWILIO_CALLBACK_OK }
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
 * Receive Twilio Real-Time Transcription events.
 *
 * Each registration URL carries the `callSessionId` in its context. We append
 * `transcription-content` utterances as tagged ThreadMessages, and on
 * `transcription-stopped` we close out the call and summarize it.
 *
 * @see https://www.twilio.com/docs/voice/twiml/transcription
 */
async function handleCallTranscription(
  request: WebhookRequest,
  context: WebhookContext,
): Promise<WebhookResponse> {
  const result = validate(request, context)
  if ('error' in result) return result.error
  const params = result.params

  const callSessionId = getCallSessionId(context)
  if (!callSessionId) {
    console.error('[callTranscription] Missing callSessionId in registration context')
    return TWILIO_CALLBACK_OK
  }

  const event = params.TranscriptionEvent
  const rawTrack = params.Track
  const track: 'inbound_track' | 'outbound_track' =
    rawTrack === 'outbound_track' ? 'outbound_track' : 'inbound_track'

  try {
    if (event === 'transcription-content') {
      let transcript = ''
      let confidence: number | undefined
      try {
        const data = JSON.parse(params.TranscriptionData ?? '{}') as {
          transcript?: string
          confidence?: number
        }
        transcript = data.transcript ?? ''
        confidence = typeof data.confidence === 'number' ? data.confidence : undefined
      } catch {
        // ignore malformed payload
      }

      if (transcript.trim().length > 0) {
        await call.appendTranscript({
          callSessionId,
          content: transcript,
          track,
          confidence,
          sequenceId: params.SequenceId ? Number(params.SequenceId) : undefined,
          isFinal: params.PartialResults !== 'true',
        })
      }
    } else if (event === 'transcription-stopped') {
      await call.end({ callSessionId, status: 'ENDED' })
      await call.summarize({ callSessionId })
    } else if (event === 'transcription-error') {
      console.error('[callTranscription] Transcription error:', params.TranscriptionError)
    }
  } catch (err) {
    console.error(`[callTranscription] Failed to handle ${event}:`, err)
  }

  return TWILIO_CALLBACK_OK
}

export const callTranscriptionRegistry: WebhookDefinition = {
  name: 'call_transcription',
  description:
    'Receive Twilio Real-Time Transcription events and append/summarize call transcripts',
  methods: ['POST'],
  handler: handleCallTranscription,
}
