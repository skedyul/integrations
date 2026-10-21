import { receiveInbound, referralFromMeta, attachmentsFromMessagingEvent } from '../../lib/inbound_message'
import { resolveChannelForMetaResource } from '../../lib/meta_webhook/resolve_channel'
import type { MetaMessengerEvent, MetaWebhookEntry } from '../../lib/meta_webhook/types'

async function processMessengerEvent(event: MetaMessengerEvent): Promise<void> {
  const senderId = event.sender?.id
  const pageId = event.recipient?.id
  const messageId = event.message?.mid
  const text = event.message?.text
  const attachments = await attachmentsFromMessagingEvent(event)

  if (!senderId || !pageId || (!text && attachments.length === 0)) {
    return
  }

  const resolved = await resolveChannelForMetaResource({
    modelHandle: 'facebook_page',
    filter: { page_id: pageId },
    channelHandle: 'messenger',
    channelIdentifierField: 'page_id',
  })

  if (!resolved) {
    console.log(`[receiveMeta:messenger] Channel not found for page ${pageId}`)
    return
  }

  await receiveInbound({
    communicationChannelId: resolved.channelId,
    from: senderId,
    to: pageId,
    text: text ?? (attachments.length > 0 ? '[Attachment]' : ''),
    remoteId: messageId,
    referral: referralFromMeta(event.referral),
    attachments: attachments.length > 0 ? attachments : undefined,
  })

  console.log('[receiveMeta:messenger] Message processed', {
    channelId: resolved.channelId,
    from: senderId,
    pageId,
    messageId,
  })
}

export async function handleMessengerWebhookEntries(
  entries: MetaWebhookEntry[] | undefined,
): Promise<void> {
  for (const entry of entries ?? []) {
    const events = [...(entry.messaging ?? []), ...(entry.standby ?? [])]
    for (const event of events) {
      try {
        await processMessengerEvent(event)
      } catch (err) {
        console.error('[receiveMeta:messenger] Failed to process event:', err)
      }
    }
  }
}
