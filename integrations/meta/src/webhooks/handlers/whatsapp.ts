import { instance } from 'skedyul'
import { MetaClient } from '../../lib/meta_client'
import { groupFromWhatsApp } from '../../lib/inbound_group'
import {
  loadInstanceAccessToken,
  receiveInbound,
  uploadRemoteFile,
} from '../../lib/inbound_message'
import { resolveChannelForMetaResource } from '../../lib/meta_webhook/resolve_channel'
import type {
  MetaWebhookChange,
  MetaWebhookEntry,
  MetaWhatsAppChangeValue,
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
  contacts: MetaWhatsAppChangeValue['contacts'],
): Promise<void> {
  const from = message.from
  const messageId = message.id
  const text = extractWhatsAppMessageText(message)

  if (!from || !text) {
    console.log('[receiveMeta:whatsapp] Skipping message without from or content')
    return
  }

  const profile = contacts?.find((contact) => contact.wa_id === from)
  const displayName = profile?.profile?.name

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

  const rows = await instance.list('whatsapp_phone_number', {
    filter: { phone_number_id: phoneNumberId },
    limit: 1,
  })
  const recordId = (rows.data[0] as { id?: string } | undefined)?.id
  const accessToken = recordId ? await loadInstanceAccessToken('whatsapp_phone_number', recordId) : null

  const attachments = accessToken
    ? await downloadWhatsAppAttachments(message, accessToken)
    : []

  const group = groupFromWhatsApp({
    groupId: message.group_id,
    subject: message.group_subject ?? message.subject,
    from,
    contacts,
  })

  await receiveInbound({
    communicationChannelId: resolved.channelId,
    from,
    to: businessPhone ?? resolved.channelIdentifier,
    text,
    remoteId: messageId,
    displayName,
    group,
    referral: message.referral
      ? {
          sourceId: message.referral.source_id,
          adId: message.referral.ad_id,
          url: message.referral.source_url,
        }
      : undefined,
    attachments: attachments.length > 0 ? attachments : undefined,
  })

  console.log('[receiveMeta:whatsapp] Message processed', {
    channelId: resolved.channelId,
    from,
    groupId: group?.identifierValue ?? null,
    messageId,
  })
}

async function downloadWhatsAppAttachments(
  message: MetaWhatsAppMessage,
  accessToken: string,
) {
  const media =
    message.image ?? message.document ?? message.audio ?? message.video
  const mediaId = media && 'id' in media ? media.id : undefined
  if (!mediaId) return []

  const META_APP_ID = process.env.META_APP_ID
  const META_APP_SECRET = process.env.META_APP_SECRET
  const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION
  if (!META_APP_ID || !META_APP_SECRET || !GRAPH_API_VERSION) return []

  const client = new MetaClient(META_APP_ID, META_APP_SECRET, GRAPH_API_VERSION)
  const url = await client.getMediaUrl(mediaId, accessToken)
  if (!url) return []

  const filename =
    message.document?.filename ??
    `${message.type ?? 'file'}-${mediaId}`
  const uploaded = await uploadRemoteFile({
    url,
    name: filename,
    mimeType: 'application/octet-stream',
    accessToken,
  })
  return uploaded ? [uploaded] : []
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
      await processWhatsAppMessage(
      phoneNumberId,
      businessPhone,
      message,
      value.contacts,
    )
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
