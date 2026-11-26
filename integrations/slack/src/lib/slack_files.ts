import { file } from 'skedyul'

/** A file on a Slack `message` event (`event.files[]`). */
export type SlackEventFile = {
  id?: string
  name?: string
  title?: string
  mimetype?: string
  size?: number
  mode?: string
  url_private?: string
  url_private_download?: string
}

export type InboundAttachment = {
  fileId: string
  name: string
  mimeType: string
  size: number
}

/** Message subtypes that are still a person's message and must be received. */
const RECEIVED_SUBTYPES = new Set(['file_share', 'thread_broadcast'])

export function isReceivedSubtype(subtype: string | undefined): boolean {
  return !subtype || RECEIVED_SUBTYPES.has(subtype)
}

/** Files Slack lets the bot download (skips tombstoned / plan-limited files). */
export function downloadableSlackFiles(files: SlackEventFile[] | undefined): SlackEventFile[] {
  return (files ?? []).filter(
    (entry) =>
      Boolean(entry.url_private_download || entry.url_private) &&
      entry.mode !== 'tombstone' &&
      entry.mode !== 'hidden_by_limit',
  )
}

/**
 * Downloads Slack files with the bot token and uploads them to Skedyul.
 * Needs the `files:read` bot scope. Without it Slack answers 200 with an
 * HTML sign-in page, so an HTML response for a non-HTML file is a failure.
 */
export async function uploadSlackFiles(
  files: SlackEventFile[] | undefined,
  botToken: string,
): Promise<InboundAttachment[]> {
  const uploaded: InboundAttachment[] = []
  for (const entry of downloadableSlackFiles(files)) {
    const url = entry.url_private_download || entry.url_private
    if (!url) continue
    const name = entry.name || entry.title || entry.id || 'file'
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${botToken}` },
      })
      const contentType =
        response.headers.get('content-type')?.split(';')[0]?.trim() || ''
      if (!response.ok) {
        console.log('[receiveSlack] File download failed', { id: entry.id, status: response.status })
        continue
      }
      if (contentType === 'text/html' && entry.mimetype !== 'text/html') {
        console.log('[receiveSlack] File download returned HTML; is files:read granted?', {
          id: entry.id,
        })
        continue
      }
      const bytes = Buffer.from(await response.arrayBuffer())
      const mimeType = entry.mimetype || contentType || 'application/octet-stream'
      const stored = await file.upload({ content: bytes, name, mimeType })
      uploaded.push({ fileId: stored.id, name, mimeType, size: bytes.length })
    } catch (error) {
      console.log('[receiveSlack] File upload failed', { id: entry.id, error })
    }
  }
  return uploaded
}
