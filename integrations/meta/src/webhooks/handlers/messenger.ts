import { communicationChannel } from 'skedyul'
import { resolveChannelForMetaResource } from '../../lib/meta_webhook/resolve_channel'
import type { MetaMessengerEvent, MetaWebhookEntry } from '../../lib/meta_webhook/types'

async function processMessengerEvent(event: MetaMessengerEvent): Promise<void> {
  const senderId = event.sender?.id
  const pageId = event.recipient?.id
  const messageId = event.message?.mid
  const text = event.message?.text

  if (!senderId || !pageId || !text) {
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

  await communicationChannel.receiveMessage({
    communicationChannelId: resolved.channelId,
    from: senderId,
    to: pageId,
    contact: {
      identifierValue: senderId,
    },
    message: {
      message: text,
      remoteId: messageId,
    },
    remoteId: messageId,
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
