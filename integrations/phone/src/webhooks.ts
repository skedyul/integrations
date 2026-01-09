import { communicationChannel } from 'skedyul'
import type {
  WebhookContext,
  WebhookRegistry,
  WebhookRequest,
  WebhookResponse,
} from 'skedyul'
import { Buffer } from 'buffer'
import { URLSearchParams } from 'url'
import twilio from 'twilio'

const getHeaderValue = (
  headers: WebhookRequest['headers'],
  key: string,
): string | undefined => {
  const exact = headers[key]
  if (exact) {
    return Array.isArray(exact) ? exact[0] : exact
  }

  const match = Object.entries(headers).find(
    ([headerKey]) => headerKey.toLowerCase() === key.toLowerCase(),
  )

  if (!match) {
    return undefined
  }

  const value = match[1]
  return Array.isArray(value) ? value[0] : value
}

const serializeBody = (body: unknown): string => {
  if (!body) {
    return ''
  }

  if (typeof body === 'string') {
    return body
  }

  if (Buffer.isBuffer(body)) {
    return body.toString('utf-8')
  }

  if (body instanceof ArrayBuffer) {
    return Buffer.from(body).toString('utf-8')
  }

  if (ArrayBuffer.isView(body)) {
    return Buffer.from(
      (body as { buffer: ArrayBuffer }).buffer,
    ).toString('utf-8')
  }

  if (body instanceof URLSearchParams) {
    return body.toString()
  }

  if (typeof body === 'object') {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(body)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          params.append(key, String(item ?? ''))
        }
      } else {
        params.append(key, String(value ?? ''))
      }
    }

    return params.toString()
  }

  return String(body)
}

async function handleReceiveSms(
  request: WebhookRequest,
  context: WebhookContext,
): Promise<WebhookResponse> {
  const { headers } = request
  const rawBody = serializeBody(request.body)
  const params = new URLSearchParams(rawBody)
  const paramsObject = Object.fromEntries(params.entries())

  const twilioSignature =
    getHeaderValue(headers, 'x-twilio-signature') ??
    getHeaderValue(headers, 'X-Twilio-Signature')

  if (!twilioSignature) {
    return {
      status: 401,
      body: { error: 'Missing Twilio signature' },
    }
  }

  const token = context.env.TWILIO_AUTH_TOKEN
  if (!token) {
    return {
      status: 500,
      body: { error: 'TWILIO_AUTH_TOKEN is not configured' },
    }
  }

  let webhookUrl = request.url
  if (!webhookUrl) {
    return {
      status: 400,
      body: { error: 'Missing webhook URL' },
    }
  }

  const ngrokUrl = context.env.NGROK_DEVELOPER_URL
  if (ngrokUrl) {
    try {
      const parsed = new URL(webhookUrl)
      parsed.hostname = ngrokUrl
      webhookUrl = parsed.toString()
    } catch {
      // fall back to original URL if parsing fails
    }
  }

  const isValid = twilio.validateRequest(
    token,
    twilioSignature,
    webhookUrl,
    paramsObject,
  )

  if (!isValid) {
    return {
      status: 403,
      body: { error: 'Invalid Twilio signature' },
    }
  }

  const from = params.get('From') ?? ''
  const to = params.get('To') ?? ''
  const body = params.get('Body') ?? ''
  const messageSid = params.get('MessageSid') ?? ''

  const channels = await communicationChannel.list({
    filter: { identifierValue: to },
    limit: 1,
  })

  if (channels.length === 0) {
    return {
      status: 404,
      body: { error: 'Communication channel not found' },
    }
  }

  const channel = channels[0]

  // Process the inbound message via the Core API
  try {
    const result = await communicationChannel.receiveMessage({
      communicationChannelId: channel.id,
      from,
      contact: {
        identifierValue: from,
      },
      message: {
        message: body,
        remoteId: messageSid || undefined,
      },
      remoteId: messageSid || undefined,
    })

    console.log('Twilio webhook processed', {
      channelId: channel.id,
      from,
      to,
      messageId: result.messageId,
    })
  } catch (err) {
    console.error('Failed to process inbound message:', err)
    return {
      status: 500,
      body: { error: 'Failed to process message' },
    }
  }

  return {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
    },
    body: '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
  }
}

export const registry: WebhookRegistry = {
  receive_sms: {
    name: 'receive_sms',
    description: 'Receives incoming SMS messages from Twilio webhooks',
    methods: ['POST'],
    handler: handleReceiveSms,
  },
}

export type WebhookName = keyof typeof registry
