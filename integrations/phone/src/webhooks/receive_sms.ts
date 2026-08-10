import { communicationChannel, instance } from 'skedyul'
import type {
  CommunicationChannelLifecycleContext,
  WebhookContext,
  WebhookLifecycleResult,
  WebhookRequest,
  WebhookResponse,
  WebhookDefinition,
} from 'skedyul'
import { URLSearchParams } from 'url'
import twilio from 'twilio'
import { getHeaderValue, serializeBody } from './lib/helpers'
import { withInstallationScope } from '../lib/installation_scope'
import {
  parseTwilioMedia,
  processMmsAttachments,
} from '../lib/mms_attachments'

const EMPTY_TWIML =
  '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'

/**
 * receiveMessage → download MMS → file.upload → attachFilesToMessage
 * Requires a workplace-scoped token (file.upload / attach).
 */
async function captureInboundSmsWithMedia(params: {
  channelId: string
  from: string
  to: string
  body: string
  messageSid: string
  formParams: URLSearchParams
  accountSid: string
  authToken: string
}): Promise<{ messageId: string }> {
  const media = parseTwilioMedia(params.formParams)

  // Media-only MMS may have an empty body; still capture a message for attachments.
  const messageResult = await communicationChannel.receiveMessage({
    communicationChannelId: params.channelId,
    from: params.from,
    contact: {
      identifierValue: params.from,
    },
    message: {
      message: params.body,
      remoteId: params.messageSid || undefined,
    },
    remoteId: params.messageSid || undefined,
  })

  if (media.length > 0) {
    console.log(
      `[Phone SMS] Processing ${media.length} MMS media item(s) for ${params.messageSid || messageResult.messageId}`,
    )
    const attachments = await processMmsAttachments({
      media,
      messageId: messageResult.messageId,
      accountSid: params.accountSid,
      authToken: params.authToken,
    })

    if (attachments.length > 0) {
      const attachResult = await communicationChannel.attachFilesToMessage({
        messageId: messageResult.messageId,
        attachments: attachments.map((a) => ({
          fileId: a.fileId,
          name: a.name,
          mimeType: a.mimeType,
          size: a.size,
        })),
      })
      console.log('[Phone SMS] Linked MMS attachments:', attachResult.attachmentCount)
    }
  }

  console.log('Twilio webhook processed', {
    channelId: params.channelId,
    from: params.from,
    to: params.to,
    messageId: messageResult.messageId,
    mediaCount: media.length,
  })

  return messageResult
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Lifecycle Hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Called when a communication channel is created.
 * Configures the Twilio phone number's SMS webhook URL.
 */
async function handleCommunicationChannelCreatedSmsWebhook(
  context: CommunicationChannelLifecycleContext,
): Promise<WebhookLifecycleResult | null> {
  const { env, webhookUrl, communicationChannel: channel } = context

  const accountSid = env.TWILIO_ACCOUNT_SID
  const authToken = env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) {
    console.log('[Webhook Lifecycle] Missing Twilio credentials, manual setup required')
    return null
  }

  const client = twilio(accountSid, authToken)

  try {
    // Find the phone number in Twilio
    const phoneNumbers = await client.incomingPhoneNumbers.list({
      phoneNumber: channel.identifierValue,
    })

    if (phoneNumbers.length === 0) {
      console.log(`[Webhook Lifecycle] Phone number ${channel.identifierValue} not found in Twilio account`)
      return null
    }

    // Update the SMS webhook URL
    const updated = await client.incomingPhoneNumbers(phoneNumbers[0].sid).update({
      smsUrl: webhookUrl,
      smsMethod: 'POST',
    })

    console.log(`[Webhook Lifecycle] Configured SMS webhook for ${channel.identifierValue}`)

    return {
      externalId: updated.sid,
      message: `Configured SMS webhook for ${channel.identifierValue}`,
      metadata: { phoneNumberSid: updated.sid },
    }
  } catch (err) {
    console.error('[Webhook Lifecycle] Failed to configure Twilio webhook:', err)
    return null
  }
}

/**
 * Called when a communication channel is updated.
 * Updates the Twilio phone number's SMS webhook URL.
 */
async function handleCommunicationChannelUpdatedSmsWebhook(
  context: CommunicationChannelLifecycleContext,
): Promise<WebhookLifecycleResult | null> {
  // Same logic as create - update the webhook URL
  return handleCommunicationChannelCreatedSmsWebhook(context)
}

/**
 * Called when a communication channel is deleted.
 * Clears the Twilio phone number's SMS webhook URL.
 */
async function handleCommunicationChannelDeletedSmsWebhook(
  context: CommunicationChannelLifecycleContext,
): Promise<WebhookLifecycleResult | null> {
  const { env, communicationChannel: channel } = context

  const accountSid = env.TWILIO_ACCOUNT_SID
  const authToken = env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) {
    console.log('[Webhook Lifecycle] Missing Twilio credentials, manual cleanup required')
    return null
  }

  const client = twilio(accountSid, authToken)

  try {
    // Find the phone number in Twilio
    const phoneNumbers = await client.incomingPhoneNumbers.list({
      phoneNumber: channel.identifierValue,
    })

    if (phoneNumbers.length === 0) {
      console.log(`[Webhook Lifecycle] Phone number ${channel.identifierValue} not found in Twilio account`)
      return null
    }

    // Clear the SMS webhook URL
    const updated = await client.incomingPhoneNumbers(phoneNumbers[0].sid).update({
      smsUrl: '',
      smsMethod: 'POST',
    })

    console.log(`[Webhook Lifecycle] Cleared SMS webhook for ${channel.identifierValue}`)

    return {
      externalId: updated.sid,
      message: `Cleared SMS webhook for ${channel.identifierValue}`,
      metadata: { phoneNumberSid: updated.sid },
    }
  } catch (err) {
    console.error('[Webhook Lifecycle] Failed to clear Twilio webhook:', err)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Handlers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle incoming SMS using the simpler flow (current implementation).
 *
 * This works because communicationChannel.list with sk_app_ token
 * already searches across all installations for the app.
 */
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

  const twilioAuthToken = context.env.TWILIO_AUTH_TOKEN
  if (!twilioAuthToken) {
    return {
      status: 500,
      body: { error: 'TWILIO_AUTH_TOKEN is not configured' },
    }
  }

  // Use request.url directly - the envelope format passes the original URL
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
    twilioAuthToken,
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
  const accountSid = context.env.TWILIO_ACCOUNT_SID
  if (!accountSid) {
    return {
      status: 500,
      body: { error: 'TWILIO_ACCOUNT_SID is not configured' },
    }
  }

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

  // Needs a workplace-scoped token for file.upload / attach. Webhook invocations
  // already run with one, so withInstallationScope skips the exchange.
  try {
    await withInstallationScope(channel.appInstallationId, async () => {
      await captureInboundSmsWithMedia({
        channelId: channel.id,
        from,
        to,
        body,
        messageSid,
        formParams: params,
        accountSid,
        authToken: twilioAuthToken,
      })
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
    body: EMPTY_TWIML,
  }
}

/**
 * Handle incoming SMS using the token exchange flow.
 *
 * This demonstrates the new pattern for webhooks:
 * 1. Use sk_app_ token to search internal models across all installations
 * 2. Exchange for installation-scoped sk_wkp_ JWT
 * 3. Continue with full access to that installation
 *
 * This flow is useful when you need to:
 * - Look up resources in internal models (e.g., phone_number)
 * - Identify which installation owns a resource
 * - Then perform operations scoped to that installation
 */
async function handleReceiveSmsWithTokenExchange(
  request: WebhookRequest,
  context: WebhookContext,
): Promise<WebhookResponse> {
  const { headers } = request
  const rawBody = serializeBody(request.body)
  const params = new URLSearchParams(rawBody)
  const paramsObject = Object.fromEntries(params.entries())

  // Validate Twilio signature
  const twilioSignature =
    getHeaderValue(headers, 'x-twilio-signature') ??
    getHeaderValue(headers, 'X-Twilio-Signature')

  if (!twilioSignature) {
    return { status: 401, body: { error: 'Missing Twilio signature' } }
  }

  const twilioAuthToken = context.env.TWILIO_AUTH_TOKEN
  if (!twilioAuthToken) {
    return { status: 500, body: { error: 'TWILIO_AUTH_TOKEN is not configured' } }
  }

  // Use X-Skedyul-Webhook-Url header if present (set by platform for accurate signature validation)
  // Use request.url directly - the envelope format passes the original URL
  let webhookUrl = request.url
  if (!webhookUrl) {
    return { status: 400, body: { error: 'Missing webhook URL' } }
  }

  const ngrokUrl = context.env.NGROK_DEVELOPER_URL
  if (ngrokUrl) {
    try {
      const parsed = new URL(webhookUrl)
      parsed.hostname = ngrokUrl
      webhookUrl = parsed.toString()
    } catch {
      // fall back to original URL
    }
  }

  const isValid = twilio.validateRequest(
    twilioAuthToken,
    twilioSignature,
    webhookUrl,
    paramsObject,
  )

  if (!isValid) {
    return { status: 403, body: { error: 'Invalid Twilio signature' } }
  }

  const from = params.get('From') ?? ''
  const to = params.get('To') ?? ''
  const body = params.get('Body') ?? ''
  const messageSid = params.get('MessageSid') ?? ''

  // ─────────────────────────────────────────────────────────────────────────────
  // Step 1: Search for phone number across all installations (uses sk_app_ token)
  // ─────────────────────────────────────────────────────────────────────────────
  const searchResults = await instance.list('phone_number', {
    filter: { phone: to },
    limit: 1,
  })

  if (searchResults.data.length === 0) {
    console.log(`[Webhook] Phone number ${to} not found in any installation`)
    return { status: 404, body: { error: 'Phone number not found' } }
  }

  const phoneRecord = searchResults.data[0] as { appInstallationId?: string }
  const appInstallationId = phoneRecord.appInstallationId

  if (!appInstallationId) {
    console.log(`[Webhook] Phone number ${to} has no appInstallationId`)
    return { status: 500, body: { error: 'Installation not found' } }
  }

  console.log(`[Webhook] Found phone ${to} in installation ${appInstallationId}`)

  // ─────────────────────────────────────────────────────────────────────────────
  // Step 2 & 3: Scope to the installation, then use that scope for all operations
  // ─────────────────────────────────────────────────────────────────────────────
  return await withInstallationScope(appInstallationId, async () => {
    // Now we have full access to this installation
    const channels = await communicationChannel.list({
      filter: { identifierValue: to },
      limit: 1,
    })

    if (channels.length === 0) {
      return { status: 404, body: { error: 'Communication channel not found' } }
    }

    const channel = channels[0]
    const accountSid = context.env.TWILIO_ACCOUNT_SID
    if (!accountSid) {
      return {
        status: 500,
        body: { error: 'TWILIO_ACCOUNT_SID is not configured' },
      }
    }

    try {
      await captureInboundSmsWithMedia({
        channelId: channel.id,
        from,
        to,
        body,
        messageSid,
        formParams: params,
        accountSid,
        authToken: twilioAuthToken,
      })
    } catch (err) {
      console.error('[Webhook] Failed to process message:', err)
      return { status: 500, body: { error: 'Failed to process message' } }
    }

    return {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
      body: EMPTY_TWIML,
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Registry Exports
// ─────────────────────────────────────────────────────────────────────────────

export const receiveSmsRegistry: WebhookDefinition = {
  name: 'receive_sms',
  description: 'Receives incoming SMS messages from Twilio webhooks',
  methods: ['POST'],
  handler: handleReceiveSms,
  onCommunicationChannelCreated: handleCommunicationChannelCreatedSmsWebhook,
  onCommunicationChannelDeleted: handleCommunicationChannelDeletedSmsWebhook,
  onCommunicationChannelUpdated: handleCommunicationChannelUpdatedSmsWebhook,
}