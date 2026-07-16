import { communicationChannel } from 'skedyul'
import { resolveChannelForMetaResource } from '../../lib/meta_webhook/resolve_channel'
import type {
  MetaWebhookChange,
  MetaWebhookEntry,
  MetaWhatsAppMessage,
} from '../../lib/meta_webhook/types'

function extractWhatsAppMessageText(message: MetaWhatsAppMessage): string | null {
  if (message.type === 'text' && message.text?.body) {
    return message.text.body
  }

  if (message.image?.caption) {
    return `[Image] ${message.image.caption}`
  }

  if (message.document?.caption) {
    return `[Document] ${message.document.caption}`
  }

  if (message.video?.caption) {
    return `[Video] ${message.video.caption}`
  }

  if (message.type === 'image') return '[Image]'
  if (message.type === 'document') return '[Document]'
  if (message.type === 'audio') return '[Audio]'
  if (message.type === 'video') return '[Video]'

  return null
}

async function processWhatsAppMessage(
  phoneNumberId: string,
  businessPhone: string | undefined,
  message: MetaWhatsAppMessage,
): Promise<void> {
  const from = message.from
  const messageId = message.id
  const text = extractWhatsAppMessageText(message)

  if (!from || !text) {
    console.log('[receiveMeta:whatsapp] Skipping message without from or content')
    return
  }

  const resolved = await resolveChannelForMetaResource({
    modelHandle: 'whatsapp_phone_number',
    filter: { phone_number_id: phoneNumberId },
    channelHandle: 'whatsapp',
    channelIdentifierField: 'phone',
  })

  if (!resolved) {
    console.log(`[receiveMeta:whatsapp] Channel not found for phone_number_id ${phoneNumberId}`)
    return
  }

  const groupId = message.group_id

  await communicationChannel.receiveMessage({
    communicationChannelId: resolved.channelId,
    from,
    to: businessPhone ?? resolved.channelIdentifier,
    contact: {
      identifierValue: from,
    },
    message: {
      message: text,
      remoteId: messageId,
    },
    remoteId: messageId,
    ...(groupId
      ? {
          group: {
            externalGroupId: groupId,
          },
        }
      : {}),
  })

  console.log('[receiveMeta:whatsapp] Message processed', {
    channelId: resolved.channelId,
    from,
    groupId: groupId ?? null,
    messageId,
  })
}

export async function handleWhatsAppWebhookEntries(
  entries: MetaWebhookEntry[] | undefined,
): Promise<void> {
  for (const entry of entries ?? []) {
    for (const change of entry.changes ?? []) {
      await handleWhatsAppChange(change)
    }
  }
}

async function handleWhatsAppChange(change: MetaWebhookChange): Promise<void> {
  const value = change.value
  if (!value || value.messaging_product !== 'whatsapp') {
    return
  }

  const phoneNumberId = value.metadata?.phone_number_id
  if (!phoneNumberId) {
    console.log('[receiveMeta:whatsapp] Missing phone_number_id in webhook')
    return
  }

  const businessPhone = value.metadata?.display_phone_number

  for (const message of value.messages ?? []) {
    try {
      await processWhatsAppMessage(phoneNumberId, businessPhone, message)
    } catch (err) {
      console.error('[receiveMeta:whatsapp] Failed to process message:', err)
    }
  }

  for (const status of value.statuses ?? []) {
    console.log('[receiveMeta:whatsapp] Status update', {
      id: status.id,
      status: status.status,
      recipientId: status.recipient_id,
    })
  }
}
