import { communicationChannel, token, runWithConfig, getConfig } from 'skedyul'
import type {
  WebhookContext,
  WebhookRequest,
  WebhookResponse,
  WebhookDefinition,
  CommunicationChannelLifecycleContext,
  WebhookLifecycleResult,
} from 'skedyul'
import { createEmailProvider, type EmailEnv } from '../lib/email_provider'
import { processAttachments } from '../lib/attachments'

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Lifecycle Hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Called when a communication channel is created.
 * For Mailgun, webhook configuration is done at the domain level in the dashboard,
 * not per-address. This hook logs the event for visibility.
 */
async function handleCommunicationChannelCreated(
  context: CommunicationChannelLifecycleContext,
): Promise<WebhookLifecycleResult | null> {
  const { communicationChannel: channel, webhookUrl } = context

  console.log(
    `[Email Webhook] Channel created for ${channel.identifierValue}, webhook URL: ${webhookUrl}`,
  )

  // Mailgun routes are configured at the domain level (via setup_mailgun_routes),
  // not per-address. Return null to indicate no per-channel setup is needed.
  return null
}

/**
 * Called when a communication channel is deleted.
 */
async function handleCommunicationChannelDeleted(
  context: CommunicationChannelLifecycleContext,
): Promise<WebhookLifecycleResult | null> {
  const { communicationChannel: channel } = context

  console.log(`[Email Webhook] Channel deleted for ${channel.identifierValue}`)

  // Mailgun routes are managed at the domain level, no per-channel cleanup needed
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Handler
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle incoming emails from the email provider.
 *
 * Flow:
 * 1. Verify webhook signature
 * 2. Parse inbound email data
 * 3. Find communication channel by recipient address
 * 4. Process attachments (download, upload to S3, create file records)
 * 5. Create chat message via communicationChannel.receiveMessage
 */
async function handleReceiveEmail(
  request: WebhookRequest,
  context: WebhookContext,
): Promise<WebhookResponse> {
  const env = context.env as EmailEnv
  const signingSecret = env.MAILGUN_SIGNING_SECRET

  if (!signingSecret) {
    console.error('[Email Webhook] Missing MAILGUN_SIGNING_SECRET')
    return {
      status: 500,
      body: { error: 'Webhook signing secret not configured' },
    }
  }

  // Create provider instance
  const provider = createEmailProvider(env, context.log)

  // Verify webhook signature
  const isValid = await provider.verifyWebhook(request, signingSecret)
  if (!isValid) {
    console.warn('[Email Webhook] Invalid signature')
    return {
      status: 401,
      body: { error: 'Invalid webhook signature' },
    }
  }

  // Parse inbound email
  const inboundEmail = await provider.parseInboundEmail(request)

  console.log('[Email Webhook] Received email:', {
    from: inboundEmail.from,
    to: inboundEmail.to,
    subject: inboundEmail.subject,
    attachmentCount: inboundEmail.attachments.length,
  })

  // Find communication channel by recipient email
  const channels = await communicationChannel.list({
    filter: { identifierValue: inboundEmail.to },
    limit: 1,
  })

  if (channels.length === 0) {
    console.log(`[Email Webhook] No channel found for ${inboundEmail.to}`)
    return {
      status: 404,
      body: { error: 'Communication channel not found' },
    }
  }

  const channel = channels[0]

  // Exchange token to get a workplace-scoped token for file operations
  // The provision-level webhook doesn't have workplace context, but the channel does
  console.log('[Email Webhook] Exchanging token for installation:', channel.appInstallationId)
  const { token: scopedToken } = await token.exchange(channel.appInstallationId)
  const currentConfig = getConfig()

  // Generate a message ID for attachment processing
  const messageId = `email-${Date.now()}-${Math.random().toString(36).slice(2)}`

  // Process attachments and create message using the scoped token
  // This ensures file.upload has the proper workplace context
  try {
    const result = await runWithConfig(
      { ...currentConfig, apiToken: scopedToken },
      async () => {
        // Process attachments with workplace-scoped token
        const attachments = await processAttachments({
          attachments: inboundEmail.attachments,
          messageId,
          provider,
        })

        console.log('[Email Webhook] Processed attachments:', attachments.length)

        // Create the inbound message
        const messageResult = await communicationChannel.receiveMessage({
          communicationChannelId: channel.id,
          from: inboundEmail.from,
          contact: {
            identifierValue: inboundEmail.from,
          },
          message: {
            message: inboundEmail.textBody,
            contentRaw: inboundEmail.htmlBody,
            title: inboundEmail.subject,
            remoteId: inboundEmail.messageId || undefined,
            // Create new chat for each email thread (emails are standalone)
            newChat: true,
            ...(attachments.length > 0 && {
              attachments: attachments.map((a) => ({
                fileId: a.fileId,
                name: a.name,
                mimeType: a.mimeType,
                size: a.size,
              })),
            }),
          },
          remoteId: inboundEmail.messageId || undefined,
        })

        return messageResult
      },
    )

    console.log('[Email Webhook] Message created:', {
      channelId: channel.id,
      messageId: result.messageId,
      from: inboundEmail.from,
      to: inboundEmail.to,
    })
  } catch (err) {
    console.error('[Email Webhook] Failed to create message:', err)
    return {
      status: 500,
      body: { error: 'Failed to process email' },
    }
  }

  return {
    status: 200,
    body: { success: true },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Registry Export
// ─────────────────────────────────────────────────────────────────────────────

export const receiveEmailRegistry: WebhookDefinition = {
  name: 'receive_email',
  description: 'Receives incoming emails from the email provider webhook',
  methods: ['POST'],
  handler: handleReceiveEmail,
  onCommunicationChannelCreated: handleCommunicationChannelCreated,
  onCommunicationChannelDeleted: handleCommunicationChannelDeleted,
}
