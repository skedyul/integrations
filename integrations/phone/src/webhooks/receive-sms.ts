import {
  communicationChannel,
  instance,
  token as tokenClient,
  runWithConfig,
  getConfig,
} from 'skedyul'
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
  // Step 2: Exchange for installation-scoped token
  // ─────────────────────────────────────────────────────────────────────────────
  const { token: scopedToken } = await tokenClient.exchange(appInstallationId)

  console.log(`[Webhook] Exchanged for installation-scoped token`)

  // ─────────────────────────────────────────────────────────────────────────────
  // Step 3: Use scoped token for subsequent operations
  // ─────────────────────────────────────────────────────────────────────────────
  const config = getConfig()

  return await runWithConfig(
    { baseUrl: config.baseUrl, apiToken: scopedToken },
    async () => {
      // Now we have full access to this installation
      const channels = await communicationChannel.list({
        filter: { identifierValue: to },
        limit: 1,
      })

      if (channels.length === 0) {
        return { status: 404, body: { error: 'Communication channel not found' } }
      }

      const channel = channels[0]

      try {
        const result = await communicationChannel.receiveMessage({
          communicationChannelId: channel.id,
          from,
          contact: { identifierValue: from },
          message: {
            message: body,
            remoteId: messageSid || undefined,
          },
          remoteId: messageSid || undefined,
        })

        console.log('[Webhook] Message processed', {
          channelId: channel.id,
          from,
          to,
          messageId: result.messageId,
        })
      } catch (err) {
        console.error('[Webhook] Failed to process message:', err)
        return { status: 500, body: { error: 'Failed to process message' } }
      }

      return {
        status: 200,
        headers: { 'Content-Type': 'application/xml' },
        body: '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      }
    },
  )
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

export const receiveSmsV2Registry: WebhookDefinition = {
  name: 'receive_sms_v2',
  description: 'Receives incoming SMS using token exchange flow (searches internal phone_number model)',
  methods: ['POST'],
  handler: handleReceiveSmsWithTokenExchange,
  onCommunicationChannelCreated: handleCommunicationChannelCreatedSmsWebhook,
  onCommunicationChannelDeleted: handleCommunicationChannelDeletedSmsWebhook,
  onCommunicationChannelUpdated: handleCommunicationChannelUpdatedSmsWebhook,
}
