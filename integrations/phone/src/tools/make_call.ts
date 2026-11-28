import skedyul, {
  type z as ZodType,
  instance,
  communicationChannel,
  webhook,
  isRuntimeContext,
} from 'skedyul'
import type { ToolDefinition } from 'skedyul'
import twilio from 'twilio'
import { createTwilioClient, withTwilioAuth } from '../lib/twilio_client'
import { getVoiceSigningKey } from '../lib/voice_signing_key'
import {
  LISTEN_TOKEN_TTL_SECONDS,
  VOICE_TOKEN_TTL_SECONDS,
  dialableNumber,
  formatCallRecipients,
  twimlAppName,
  voiceIdentity,
} from '../lib/outbound_voice'
import {
  createSuccessResponse,
  createValidationError,
  createNotFoundError,
  createPhoneError,
} from '../lib/response'

const { z } = skedyul

const MakeCallInputSchema = z.object({
  intent: z
    .enum(['call', 'listen', 'recipients'])
    .optional()
    .describe(
      'call (default): let a client ring toNumber. listen: let a device be rung when the number is called. recipients: record which members the number rings.',
    ),
  communicationChannelId: z.string().describe('The channel (number) this is about'),
  toNumber: z.string().optional().describe('The number to call (intent call)'),
  device: z.enum(['ios', 'android']).optional().describe('The device registering (intent listen)'),
  memberIds: z.array(z.string()).optional().describe('Who the number rings (intent recipients)'),
  threadId: z.string().optional().describe('The conversation the call was started from'),
  agentMemberId: z.string().optional().describe('The team member placing the call'),
  agentName: z.string().optional().describe("The team member's name"),
})

/**
 * What a client needs to place the call itself. The platform passes this
 * through untouched; the client's Twilio transport reads it.
 */
const MakeCallOutputSchema = z.object({
  provider: z.literal('twilio').optional(),
  token: z.string().optional(),
  params: z.record(z.string(), z.string()).optional(),
  fromNumber: z.string().optional(),
  expiresInSeconds: z.number().optional(),
  /** For intent recipients. */
  status: z.string().optional(),
})

type MakeCallInput = ZodType.infer<typeof MakeCallInputSchema>
type MakeCallOutput = ZodType.infer<typeof MakeCallOutputSchema>

/**
 * The TwiML Application clients connect to, created on first use. Its voice
 * URL is our `outbound_call` webhook.
 */
async function ensureTwimlAppSid(
  client: ReturnType<typeof createTwilioClient>,
  appInstallationId: string,
): Promise<string> {
  const friendlyName = twimlAppName(appInstallationId)
  const existing = await withTwilioAuth(() =>
    client.applications.list({ friendlyName, limit: 1 }),
  )
  if (existing[0]?.voiceUrl) return existing[0].sid

  const registration = await webhook.create('outbound_call')
  if (existing[0]) {
    await withTwilioAuth(() =>
      client.applications(existing[0].sid).update({
        voiceUrl: registration.url,
        voiceMethod: 'POST',
      }),
    )
    return existing[0].sid
  }
  const created = await withTwilioAuth(() =>
    client.applications.create({
      friendlyName,
      voiceUrl: registration.url,
      voiceMethod: 'POST',
    }),
  )
  return created.sid
}

export const makeCallRegistry: ToolDefinition<MakeCallInput, MakeCallOutput> = {
  name: 'make_call',
  label: 'Make Call',
  ui: {
    title: 'Started a call',
    activeTitle: 'Starting a call',
  },
  description:
    'Lets a Skedyul client place a call from one of the workplace numbers. Returns a short-lived token; nothing rings until the client connects with it.',
  inputSchema: MakeCallInputSchema,
  outputSchema: MakeCallOutputSchema,
  handler: async (input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    const intent = input.intent ?? 'call'

    // Who the number rings in the app. No Twilio involved: the choice is
    // kept on the number's record, where receive_call reads it.
    if (intent === 'recipients') {
      try {
        const channel = await communicationChannel.get(input.communicationChannelId)
        const lineNumber = channel?.identifierValue
        if (!lineNumber) {
          return createNotFoundError('Channel', input.communicationChannelId)
        }
        const found = await instance.list('phone_number', {
          filter: { phone: { eq: lineNumber } },
          limit: 1,
        })
        const record = found.data[0] as unknown as { id: string } | undefined
        if (!record) {
          return createNotFoundError('Phone number', lineNumber)
        }
        await instance.update('phone_number', record.id, {
          app_call_recipients: formatCallRecipients(input.memberIds ?? []),
        })
        return createSuccessResponse({ status: 'success' })
      } catch (error) {
        console.error('[MakeCall] Failed to record call recipients', error)
        return createPhoneError(
          `Failed to update who this number rings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        )
      }
    }

    const toNumber = intent === 'call' ? dialableNumber(input.toNumber) : null
    if (intent === 'call' && !toNumber) {
      return createValidationError('That is not a phone number that can be called')
    }

    const accountSid = context.env.TWILIO_ACCOUNT_SID
    if (!accountSid) {
      return createValidationError('Calling is not set up yet: Twilio is not connected')
    }

    try {
      const channel = await communicationChannel.get(input.communicationChannelId)
      const lineNumber = channel?.identifierValue
      if (!lineNumber) {
        return createNotFoundError('Channel', input.communicationChannelId)
      }
      const found = await instance.list('phone_number', {
        filter: { phone: { eq: lineNumber } },
        limit: 1,
      })
      const phoneRecord = found.data[0] as unknown as
        | { phone: string; outbound_voice_enabled?: boolean | null }
        | undefined
      if (!phoneRecord) {
        return createNotFoundError('Phone number', lineNumber)
      }
      const client = createTwilioClient(context.env)
      const { sid: keySid, secret: keySecret } = await getVoiceSigningKey(
        client,
        context.env,
      )

      // A device being rung: a longer-lived token that may receive, tied to
      // the push credential that can wake that kind of device.
      if (intent === 'listen') {
        const pushCredentialSid =
          input.device === 'android'
            ? context.env.TWILIO_PUSH_CREDENTIAL_SID_ANDROID
            : context.env.TWILIO_PUSH_CREDENTIAL_SID_IOS
        if (!pushCredentialSid) {
          return createValidationError(
            'Incoming calls are not set up for this kind of phone yet: the app needs a Twilio push credential',
          )
        }
        const listenToken = new twilio.jwt.AccessToken(accountSid, keySid, keySecret, {
          identity: voiceIdentity(input.agentMemberId ?? 'unknown'),
          ttl: LISTEN_TOKEN_TTL_SECONDS,
        })
        listenToken.addGrant(
          new twilio.jwt.AccessToken.VoiceGrant({
            incomingAllow: true,
            pushCredentialSid,
          }),
        )
        return createSuccessResponse({
          provider: 'twilio' as const,
          token: listenToken.toJwt(),
          params: {},
          fromNumber: phoneRecord.phone,
          expiresInSeconds: LISTEN_TOKEN_TTL_SECONDS,
        })
      }

      if (phoneRecord.outbound_voice_enabled !== true) {
        return createValidationError(
          'Outgoing calls are turned off for this number. Turn them on in its Calls & number settings.',
        )
      }

      const applicationSid = await ensureTwimlAppSid(client, context.appInstallationId)

      const token = new twilio.jwt.AccessToken(accountSid, keySid, keySecret, {
        identity: voiceIdentity(input.agentMemberId ?? 'unknown'),
        ttl: VOICE_TOKEN_TTL_SECONDS,
      })
      token.addGrant(
        new twilio.jwt.AccessToken.VoiceGrant({
          outgoingApplicationSid: applicationSid,
          incomingAllow: false,
        }),
      )

      return createSuccessResponse({
        provider: 'twilio' as const,
        token: token.toJwt(),
        // Sent back to us by Twilio when the client connects (outbound_call).
        params: {
          To: toNumber!,
          ChannelId: input.communicationChannelId,
          ...(input.threadId ? { ThreadId: input.threadId } : {}),
          ...(input.agentMemberId ? { MemberId: input.agentMemberId } : {}),
          ...(input.agentName ? { AgentName: input.agentName } : {}),
        },
        fromNumber: phoneRecord.phone,
        expiresInSeconds: VOICE_TOKEN_TTL_SECONDS,
      })
    } catch (error) {
      console.error('[MakeCall] Failed to prepare the call', error)
      return createPhoneError(
        `Failed to start the call: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  },
}
