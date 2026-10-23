import type { WebhookDefinition, WebhookRequest, WebhookResponse } from 'skedyul'
import {
  communicationChannel,
  getConfig,
  instance,
  runWithConfig,
  token,
} from 'skedyul'
import { SlackClient, verifySlackSignature } from '../lib/slack_client'

type SlackEventBody = {
  type?: string
  challenge?: string
  team_id?: string
  event?: {
    type?: string
    subtype?: string
    bot_id?: string
    channel?: string
    channel_type?: string
    user?: string
    text?: string
    ts?: string
    thread_ts?: string
  }
}

function rawBody(body: WebhookRequest['body']): string {
  if (typeof body === 'string') return body
  if (Buffer.isBuffer(body)) return body.toString('utf8')
  return JSON.stringify(body ?? {})
}

async function resolveSlackChannel(teamId: string): Promise<{
  channelId: string
  botToken: string | null
} | null> {
  const rows = await instance.list('slack_workspace', {
    filter: { team_id: teamId },
    limit: 1,
  })
  const record = rows.data[0] as { id?: string; appInstallationId?: string } | undefined
  if (!record?.id || !record.appInstallationId) return null

  const full = await instance.get('slack_workspace', record.id, { includeEnv: true })
  const botToken =
    typeof full?.env?.ACCESS_TOKEN === 'string' ? full.env.ACCESS_TOKEN : null

  const { token: scopedToken } = await token.exchange(record.appInstallationId)
  const config = getConfig()
  const channelId = await runWithConfig(
    { baseUrl: config.baseUrl, apiToken: scopedToken },
    async () => {
      const channels = await communicationChannel.list({
        filter: { identifierValue: teamId },
        limit: 1,
      })
      return channels[0]?.id ?? null
    },
  )
  if (!channelId) return null
  return { channelId, botToken }
}

async function handleReceiveSlack(
  request: WebhookRequest,
  context: { env: Record<string, string | undefined> },
): Promise<WebhookResponse> {
  const signingSecret = context.env.SLACK_SIGNING_SECRET || process.env.SLACK_SIGNING_SECRET
  if (!signingSecret) {
    return { status: 500, body: { error: 'SLACK_SIGNING_SECRET is not configured' } }
  }

  const bodyText = rawBody(request.body)
  const timestamp = headerValue(request.headers, 'x-slack-request-timestamp')
  const signature = headerValue(request.headers, 'x-slack-signature')
  if (
    !verifySlackSignature({
      signingSecret,
      timestamp,
      signature,
      rawBody: bodyText,
    })
  ) {
    return { status: 401, body: { error: 'Invalid Slack signature' } }
  }

  const payload = (typeof request.body === 'object' && request.body
    ? request.body
    : JSON.parse(bodyText)) as SlackEventBody

  if (payload.type === 'url_verification') {
    return { status: 200, body: { challenge: payload.challenge } }
  }

  const event = payload.event
  if (payload.type !== 'event_callback' || event?.type !== 'message') {
    return { status: 200, body: { ok: true } }
  }
  if (event.subtype || event.bot_id || !event.user || !event.channel || !payload.team_id) {
    return { status: 200, body: { ok: true } }
  }
  if (!event.text) {
    return { status: 200, body: { ok: true } }
  }

  const resolved = await resolveSlackChannel(payload.team_id)
  if (!resolved) {
    console.log(`[receiveSlack] No channel for team ${payload.team_id}`)
    return { status: 200, body: { ok: true } }
  }

  const profile = resolved.botToken
    ? await new SlackClient(resolved.botToken).userInfo(event.user)
    : null
  const isDirect = event.channel_type === 'im'

  await communicationChannel.receiveMessage({
    communicationChannelId: resolved.channelId,
    from: event.user,
    to: payload.team_id,
    contact:
      profile?.name || profile?.image
        ? {
            displayName: profile?.name,
            avatarUrl: profile?.image,
          }
        : undefined,
    message: {
      message: event.text,
      remoteId: event.ts,
    },
    remoteId: event.ts,
    threadExternalId:
      event.thread_ts && event.thread_ts !== event.ts ? event.thread_ts : undefined,
    group: isDirect
      ? undefined
      : {
          identifierValue: event.channel,
          internal: true,
        },
  })

  return { status: 200, body: { ok: true } }
}

function headerValue(
  headers: WebhookRequest['headers'],
  name: string,
): string | undefined {
  const value = headers[name] ?? headers[name.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

export const receiveSlackRegistry: WebhookDefinition = {
  name: 'receive_slack',
  description: 'Slack Events API for channels and direct messages',
  methods: ['POST'],
  type: 'CALLBACK',
  handler: handleReceiveSlack,
}
