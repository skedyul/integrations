import { webhook, call } from 'skedyul'
import type {
  WebhookDefinition,
  WebhookRequest,
  WebhookResponse,
  WebhookContext,
} from 'skedyul'
import { validateAndParse } from './receive_call'
import { buildDialTwiml, twimlHangup, twimlResponse } from './lib/twiml'

type Registration = {
  callSessionId?: string
  forwardingNumber?: string
  callerId?: string
}

const registrationOf = (context: WebhookContext): Registration => {
  const reg = (context as { registration?: Record<string, unknown> }).registration ?? {}
  const text = (value: unknown) =>
    typeof value === 'string' && value ? value : undefined
  return {
    callSessionId: text(reg.callSessionId),
    forwardingNumber: text(reg.forwardingNumber),
    callerId: text(reg.callerId),
  }
}

/**
 * Twilio has finished ringing the team's Skedyul apps for an incoming call
 * and asks what to do next.
 *
 * - Someone answered in the app (`DialCallStatus` completed): the
 *   conversation has happened; close the call out.
 * - Nobody did: forward to the number's forwarding number, exactly as a
 *   call did before the app could ring. With no forwarding number, the call
 *   is missed.
 */
async function handleCallFallback(
  request: WebhookRequest,
  context: WebhookContext,
): Promise<WebhookResponse> {
  const result = validateAndParse(request, context)
  if ('error' in result) return result.error
  const params = result.params
  const { callSessionId, forwardingNumber, callerId } = registrationOf(context)

  const answered = (params.DialCallStatus ?? '').toLowerCase() === 'completed'
  if (answered) {
    if (callSessionId) {
      try {
        const seconds = Number(params.DialCallDuration)
        await call.end({
          callSessionId,
          status: 'ENDED',
          externalStatus: 'completed',
          ...(Number.isFinite(seconds) && seconds > 0 ? { duration: seconds } : {}),
        })
      } catch (err) {
        console.error('[callFallback] Failed to end the call session:', err)
      }
    }
    return twimlHangup()
  }

  if (!forwardingNumber || !callerId) {
    if (callSessionId) {
      try {
        await call.end({
          callSessionId,
          status: 'MISSED',
          externalStatus: params.DialCallStatus ?? 'no-answer',
        })
      } catch (err) {
        console.error('[callFallback] Failed to mark the call missed:', err)
      }
    }
    return twimlHangup()
  }

  // On to the forwarding number. Transcription was started when the call
  // came in and is still running, so it is not started again.
  let statusCallbackUrl: string | undefined
  if (callSessionId) {
    try {
      statusCallbackUrl = (await webhook.create('call_status', { callSessionId })).url
    } catch (err) {
      console.error('[callFallback] Failed to register the status callback:', err)
    }
  }
  return twimlResponse(
    buildDialTwiml({
      callerId,
      forwardingNumber,
      statusCallbackUrl,
      transcriptionName: callSessionId ?? `call-${Date.now()}`,
    }),
  )
}

export const callFallbackRegistry: WebhookDefinition = {
  name: 'call_fallback',
  description:
    'After ringing team members in the Skedyul app: close out an answered call, or forward an unanswered one to the forwarding number',
  methods: ['POST'],
  type: 'CALLBACK',
  handler: handleCallFallback,
}
