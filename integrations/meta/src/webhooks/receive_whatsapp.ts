import { communicationChannel } from 'skedyul'
import type {
  WebhookDefinition,
  WebhookRequest,
  WebhookResponse,
  WebhookContext,
} from 'skedyul'
import crypto from 'crypto'

/**
 * Verify Meta webhook signature
 */
function verifySignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  if (!signature || !secret) {
    return false
  }

  // Meta sends signature as sha256=<hash>
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  // Extract hash from signature header
  const receivedHash = signature.replace('sha256=', '')

  // Use timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(receivedHash),
  )
}

/**
 * Handle incoming WhatsApp messages from Meta webhooks.
 * 
 * Supports:
 * - GET: Webhook verification challenge
 * - POST: Incoming messages
 */
async function handleReceiveWhatsApp(
  request: WebhookRequest,
  context: WebhookContext,
): Promise<WebhookResponse> {
  const { method, query, body, headers } = request
  // Provision-level env vars are baked into the container at provisioning time
  // Check process.env as fallback if not in context.env
  const META_WEBHOOK_VERIFY_TOKEN = context.env.META_WEBHOOK_VERIFY_TOKEN || process.env.META_WEBHOOK_VERIFY_TOKEN
  const META_APP_SECRET = context.env.META_APP_SECRET || process.env.META_APP_SECRET

  // Handle webhook verification (GET request)
  if (method === 'GET') {
    // Meta sends query params as flat keys: hub.mode, hub.verify_token, hub.challenge
    const mode = query?.['hub.mode'] || (query?.hub as any)?.mode
    const token = query?.['hub.verify_token'] || (query?.hub as any)?.verify_token
    const challenge = query?.['hub.challenge'] || (query?.hub as any)?.challenge

    if (mode === 'subscribe' && token === META_WEBHOOK_VERIFY_TOKEN) {
      console.log('[receiveWhatsApp] Webhook verification successful')
      return {
        status: 200,
        body: challenge || '',
      }
    }

    console.log('[receiveWhatsApp] Webhook verification failed', {
      mode,
      tokenMatch: token === META_WEBHOOK_VERIFY_TOKEN,
    })
    return {
      status: 403,
      body: { error: 'Verification failed' },
    }
  }

  // Handle incoming messages (POST request)
  if (method === 'POST') {
    if (!META_APP_SECRET) {
      console.error('[receiveWhatsApp] META_APP_SECRET is not configured')
      return {
        status: 500,
        body: { error: 'META_APP_SECRET is not configured' },
      }
    }

    // Verify webhook signature
    const signature = headers['x-hub-signature-256'] || headers['X-Hub-Signature-256']
    if (!signature) {
      console.log('[receiveWhatsApp] Missing webhook signature')
      return {
        status: 401,
        body: { error: 'Missing webhook signature' },
      }
    }

    // Get raw body for signature verification
    const rawBody = typeof body === 'string' ? body : JSON.stringify(body || {})
    const isValid = verifySignature(rawBody, signature, META_APP_SECRET)

    if (!isValid) {
      console.log('[receiveWhatsApp] Invalid webhook signature')
      return {
        status: 403,
        body: { error: 'Invalid webhook signature' },
      }
    }

    // Parse webhook payload
    let payload: any
    try {
      payload = typeof body === 'string' ? JSON.parse(body) : body
    } catch {
      return {
        status: 400,
        body: { error: 'Invalid JSON payload' },
      }
    }

    // Meta sends webhooks with this structure:
    // {
    //   "object": "whatsapp_business_account",
    //   "entry": [{
    //     "changes": [{
    //       "value": {
    //         "messaging_product": "whatsapp",
    //         "metadata": { "phone_number_id": "..." },
    //         "messages": [{
    //           "from": "+1234567890",
    //           "id": "wamid.xxx",
    //           "timestamp": "1234567890",
    //           "text": { "body": "Hello" },
    //           "type": "text"
    //         }]
    //       }
    //     }]
    //   }]
    // }

    if (payload.object !== 'whatsapp_business_account') {
      console.log('[receiveWhatsApp] Ignoring non-WhatsApp webhook')
      return {
        status: 200,
        body: { success: true },
      }
    }

    // Process each entry
    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value
        if (!value || value.messaging_product !== 'whatsapp') {
          continue
        }

        const phoneNumberId = value.metadata?.phone_number_id
        if (!phoneNumberId) {
          console.log('[receiveWhatsApp] Missing phone_number_id in webhook')
          continue
        }

        // Process each message
        for (const message of value.messages || []) {
          const from = message.from
          const messageId = message.id
          const text = message.text?.body || ''
          const timestamp = message.timestamp

          if (!from || !text) {
            console.log('[receiveWhatsApp] Skipping message without from or text')
            continue
          }

          // Find the communication channel by phone number
          // We need to look up the phone number from phone_number_id
          // For now, we'll search by phone number directly
          // In a production system, you'd want to store phone_number_id -> phone mapping
          const channels = await communicationChannel.list({
            filter: { identifierValue: from },
            limit: 1,
          })

          if (channels.length === 0) {
            console.log(`[receiveWhatsApp] Channel not found for ${from}`)
            continue
          }

          const channel = channels[0]

          try {
            const result = await communicationChannel.receiveMessage({
              communicationChannelId: channel.id,
              from,
              contact: {
                identifierValue: from,
              },
              message: {
                message: text,
                remoteId: messageId || undefined,
              },
              remoteId: messageId || undefined,
            })

            console.log('[receiveWhatsApp] Message processed', {
              channelId: channel.id,
              from,
              messageId: result.messageId,
            })
          } catch (err) {
            console.error('[receiveWhatsApp] Failed to process message:', err)
            // Continue processing other messages
          }
        }
      }
    }

    return {
      status: 200,
      body: { success: true },
    }
  }

  return {
    status: 405,
    body: { error: 'Method not allowed' },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Registry Export
// ─────────────────────────────────────────────────────────────────────────────

export const receiveWhatsAppRegistry: WebhookDefinition = {
  name: 'receive_whatsapp',
  description: 'Receives incoming WhatsApp messages from Meta webhooks',
  methods: ['GET', 'POST'],
  handler: handleReceiveWhatsApp,
}
