import { communicationChannel } from 'skedyul'
import { resolveChannelForMetaResource } from '../../lib/meta_webhook/resolve_channel'
import type { MetaMessengerEvent, MetaWebhookEntry } from '../../lib/meta_webhook/types'

async function processInstagramEvent(event: MetaMessengerEvent): Promise<void> {
  const senderId = event.sender?.id
  const instagramAccountId = event.recipient?.id
  const messageId = event.message?.mid
  const text = event.message?.text

  if (!senderId || !instagramAccountId || !text) {
    return
  }

  const resolved = await resolveChannelForMetaResource({
    modelHandle: 'instagram_account',
    filter: { instagram_account_id: instagramAccountId },
    channelHandle: 'instagram',
    channelIdentifierField: 'instagram_account_id',
  })

  if (!resolved) {
    console.log(
      `[receiveMeta:instagram] Channel not found for account ${instagramAccountId}`,
    )
    return
  }

  await communicationChannel.receiveMessage({
    communicationChannelId: resolved.channelId,
    from: senderId,
    to: instagramAccountId,
    contact: {
      identifierValue: senderId,
    },
    message: {
      message: text,
      remoteId: messageId,
    },
    remoteId: messageId,
  })

  console.log('[receiveMeta:instagram] Message processed', {
    channelId: resolved.channelId,
    from: senderId,
    instagramAccountId,
    messageId,
  })
}

export async function handleInstagramWebhookEntries(
  entries: MetaWebhookEntry[] | undefined,
): Promise<void> {
  for (const entry of entries ?? []) {
    const events = [...(entry.messaging ?? []), ...(entry.standby ?? [])]
    for (const event of events) {
      try {
        await processInstagramEvent(event)
      } catch (err) {
        console.error('[receiveMeta:instagram] Failed to process event:', err)
      }
    }
  }
}
