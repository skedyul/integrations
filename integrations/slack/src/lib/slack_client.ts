import { createHmac, timingSafeEqual } from 'node:crypto'

export class SlackClient {
  constructor(private readonly botToken: string) {}

  async postMessage(input: {
    channel: string
    text: string
    threadTs?: string
  }): Promise<{ ts?: string; ok: boolean; error?: string }> {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: input.channel,
        text: input.text,
        ...(input.threadTs ? { thread_ts: input.threadTs } : {}),
      }),
    })
    return (await response.json()) as { ts?: string; ok: boolean; error?: string }
  }
}

export async function exchangeSlackCode(input: {
  clientId: string
  clientSecret: string
  code: string
  redirectUri: string
}): Promise<{
  accessToken: string
  teamId: string
  teamName?: string
}> {
  const body = new URLSearchParams({
    client_id: input.clientId,
    client_secret: input.clientSecret,
    code: input.code,
    redirect_uri: input.redirectUri,
  })
  const response = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const payload = (await response.json()) as {
    ok?: boolean
    error?: string
    access_token?: string
    team?: { id?: string; name?: string }
  }
  if (!payload.ok || !payload.access_token || !payload.team?.id) {
    throw new Error(payload.error || 'Slack OAuth failed')
  }
  return {
    accessToken: payload.access_token,
    teamId: payload.team.id,
    teamName: payload.team.name,
  }
}

export function verifySlackSignature(input: {
  signingSecret: string
  timestamp: string | undefined
  signature: string | undefined
  rawBody: string
}): boolean {
  if (!input.timestamp || !input.signature) return false
  const ageSeconds = Math.abs(Date.now() / 1000 - Number(input.timestamp))
  if (!Number.isFinite(ageSeconds) || ageSeconds > 60 * 5) return false
  const base = `v0:${input.timestamp}:${input.rawBody}`
  const digest = `v0=${createHmac('sha256', input.signingSecret).update(base).digest('hex')}`
  const left = Buffer.from(digest)
  const right = Buffer.from(input.signature)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}
