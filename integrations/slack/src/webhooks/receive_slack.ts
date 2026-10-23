import type { WebhookDefinition, WebhookRequest, WebhookResponse } from 'skedyul'
import { communicationChannel } from 'skedyul'
import { verifySlackSignature } from '../lib/slack_client'

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

  const channels = await communicationChannel.list({
    filter: { identifierValue: payload.team_id },
    limit: 1,
  })
  const channelId = channels[0]?.id
  if (!channelId) {
    console.log(`[receiveSlack] No channel for team ${payload.team_id}`)
    return { status: 200, body: { ok: true } }
  }

  const isDirect = event.channel_type === 'im'

  await communicationChannel.receiveMessage({
    communicationChannelId: channelId,
    from: event.user,
    to: payload.team_id,
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
