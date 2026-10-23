import { groupFromMessaging } from '../../lib/inbound_group'
import {
  attachmentsFromMessagingEvent,
  loadInstagramPageAccessToken,
  loadSenderProfile,
  receiveInbound,
  referralFromMeta,
} from '../../lib/inbound_message'
import { resolveChannelForMetaResource } from '../../lib/meta_webhook/resolve_channel'
import type { MetaMessengerEvent, MetaWebhookEntry } from '../../lib/meta_webhook/types'

async function processInstagramEvent(event: MetaMessengerEvent): Promise<void> {
  const senderId = event.sender?.id
  const instagramAccountId = event.recipient?.id
  const messageId = event.message?.mid
  const text = event.message?.text
  const attachments = await attachmentsFromMessagingEvent(event)

  if (!senderId || !instagramAccountId || (!text && attachments.length === 0)) {
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

  const profile = await loadSenderProfile({
    userId: senderId,
    accessToken: await loadInstagramPageAccessToken(instagramAccountId),
    logLabel: 'instagram',
  })
  const displayName = event.sender?.name?.trim() || profile.name

  await receiveInbound({
    communicationChannelId: resolved.channelId,
    from: senderId,
    to: instagramAccountId,
    text: text ?? (attachments.length > 0 ? '[Attachment]' : ''),
    remoteId: messageId,
    displayName,
    avatarUrl: profile.avatarUrl,
    group: groupFromMessaging({
      threadId: event.thread_id ?? event.thread?.id,
      threadName: event.thread?.name,
      senderId,
      senderName: displayName,
      senderAvatarUrl: profile.avatarUrl,
    }),
    referral: referralFromMeta(event.referral),
    attachments: attachments.length > 0 ? attachments : undefined,
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
