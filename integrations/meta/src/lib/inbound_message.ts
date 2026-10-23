import { communicationChannel, file, instance } from 'skedyul'
import { profileFromGraph } from './sender_profile'

export type InboundAttachment = {
  fileId: string
  name: string
  mimeType: string
  size: number
}

export async function uploadRemoteFile(input: {
  url: string
  name: string
  mimeType: string
  accessToken?: string
}): Promise<InboundAttachment | null> {
  const headers: Record<string, string> = {}
  if (input.accessToken) {
    headers.Authorization = `Bearer ${input.accessToken}`
  }

  const response = await fetch(input.url, { headers })
  if (!response.ok) return null

  const bytes = Buffer.from(await response.arrayBuffer())
  const mimeType =
    response.headers.get('content-type')?.split(';')[0]?.trim() || input.mimeType
  const uploaded = await file.upload({
    content: bytes,
    name: input.name,
    mimeType,
  })

  return {
    fileId: uploaded.id,
    name: input.name,
    mimeType,
    size: bytes.length,
  }
}

export async function attachmentsFromMessagingEvent(
  event: {
    message?: {
      attachments?: Array<{ type?: string; payload?: { url?: string } }>
    }
  },
): Promise<InboundAttachment[]> {
  const attachments = event.message?.attachments ?? []
  const uploaded: InboundAttachment[] = []
  for (const attachment of attachments) {
    const url = attachment.payload?.url
    if (!url) continue
    const file = await uploadRemoteFile({
      url,
      name: `${attachment.type ?? 'file'}`,
      mimeType: 'application/octet-stream',
    })
    if (file) uploaded.push(file)
  }
  return uploaded
}

export function referralFromMeta(referral: {
  source_id?: string
  ad_id?: string
  source_url?: string
} | undefined): { sourceId?: string; adId?: string; url?: string } | undefined {
  if (!referral) return undefined
  const sourceId = referral.source_id
  const adId = referral.ad_id
  const url = referral.source_url
  if (!sourceId && !adId && !url) return undefined
  return { sourceId, adId, url }
}

async function graphGet(
  path: string,
  accessToken: string,
  fields: string,
): Promise<unknown> {
  const version = process.env.GRAPH_API_VERSION || 'v24.0'
  const url = new URL(`https://graph.facebook.com/${version}/${path}`)
  url.searchParams.set('fields', fields)
  url.searchParams.set('access_token', accessToken)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Graph ${path} returned ${response.status}`)
  }
  return response.json()
}

/** Page access token stored on the facebook_page instance. */
export async function loadPageAccessToken(pageId: string): Promise<string | null> {
  const pages = await instance.list('facebook_page', {
    filter: { page_id: pageId },
    limit: 1,
  })
  const recordId = (pages.data[0] as { id?: string } | undefined)?.id
  if (!recordId) return null
  return loadInstanceAccessToken('facebook_page', recordId)
}

/** Instagram sends and profile reads use the linked Facebook page token. */
export async function loadInstagramPageAccessToken(
  instagramAccountId: string,
): Promise<string | null> {
  const accounts = await instance.list('instagram_account', {
    filter: { instagram_account_id: instagramAccountId },
    limit: 1,
  })
  const pageId = (accounts.data[0] as { facebook_page_id?: string } | undefined)
    ?.facebook_page_id
  if (!pageId) return null
  return loadPageAccessToken(pageId)
}

/**
 * Messenger PSID or Instagram IGSID profile.
 * A failed call returns an empty profile so the message is still received.
 */
export async function loadSenderProfile(input: {
  userId: string
  accessToken: string | null
  logLabel: string
}): Promise<{ name?: string; avatarUrl?: string }> {
  if (!input.accessToken) return {}
  try {
    const body = await graphGet(input.userId, input.accessToken, 'name,profile_pic')
    return profileFromGraph(body)
  } catch (err) {
    console.warn(`[receiveMeta:${input.logLabel}] Profile lookup failed`, err)
    return {}
  }
}

export async function loadInstanceAccessToken(
  modelHandle: string,
  recordId: string,
): Promise<string | null> {
  const record = await instance.get(modelHandle, recordId, { includeEnv: true })
  const token = record?.env?.ACCESS_TOKEN
  return typeof token === 'string' && token.length > 0 ? token : null
}

export async function receiveInbound(input: {
  communicationChannelId: string
  from: string
  to?: string
  text: string
  remoteId?: string
  displayName?: string
  avatarUrl?: string | null
  group?: {
    identifierValue?: string
    name?: string
    internal?: boolean
    participants?: Array<{
      identifierValue: string
      displayName?: string
      avatarUrl?: string | null
    }>
  }
  referral?: { sourceId?: string; adId?: string; url?: string }
  threadExternalId?: string
  attachments?: InboundAttachment[]
}): Promise<void> {
  await communicationChannel.receiveMessage({
    communicationChannelId: input.communicationChannelId,
    from: input.from,
    to: input.to,
    contact:
      input.displayName || input.avatarUrl
        ? {
            displayName: input.displayName,
            avatarUrl: input.avatarUrl,
          }
        : undefined,
    message: {
      message: input.text,
      remoteId: input.remoteId,
      attachments: input.attachments,
    },
    remoteId: input.remoteId,
    group: input.group,
    referral: input.referral,
    threadExternalId: input.threadExternalId,
  })
}
