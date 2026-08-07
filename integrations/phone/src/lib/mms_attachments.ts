/**
 * MMS media download + upload helpers for Twilio inbound webhooks.
 */

import { file } from 'skedyul'

export type TwilioMmsMedia = {
  url: string
  contentType: string
  index: number
}

export type ProcessedMmsAttachment = {
  fileId: string
  name: string
  mimeType: string
  size: number
}

/**
 * Parse Twilio NumMedia / MediaUrlN / MediaContentTypeN form fields.
 */
export function parseTwilioMedia(params: URLSearchParams): TwilioMmsMedia[] {
  const numMedia = Number.parseInt(params.get('NumMedia') ?? '0', 10)
  if (!Number.isFinite(numMedia) || numMedia <= 0) {
    return []
  }

  const media: TwilioMmsMedia[] = []
  for (let i = 0; i < numMedia; i++) {
    const url = params.get(`MediaUrl${i}`)
    if (!url) {
      continue
    }
    media.push({
      url,
      contentType: params.get(`MediaContentType${i}`) || 'application/octet-stream',
      index: i,
    })
  }
  return media
}

function extensionForMime(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/mp4': 'm4a',
    'audio/aac': 'aac',
    'audio/ogg': 'ogg',
    'audio/amr': 'amr',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'video/mp4': 'mp4',
    'video/3gpp': '3gp',
    'application/pdf': 'pdf',
  }
  return map[mimeType.toLowerCase()] ?? 'bin'
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^\.+/, '')
    .substring(0, 255)
}

/**
 * Download a Twilio media URL using Account SID + Auth Token basic auth.
 */
export async function downloadTwilioMedia(
  url: string,
  accountSid: string,
  authToken: string,
): Promise<Buffer> {
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(
      `Failed to download Twilio media: ${response.status} ${response.statusText}`,
    )
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Download MMS media from Twilio and upload each file via skedyul file.upload.
 */
export async function processMmsAttachments(params: {
  media: TwilioMmsMedia[]
  messageId: string
  accountSid: string
  authToken: string
}): Promise<ProcessedMmsAttachment[]> {
  const { media, messageId, accountSid, authToken } = params
  if (media.length === 0) {
    return []
  }

  const processed: ProcessedMmsAttachment[] = []

  for (const item of media) {
    try {
      const content = await downloadTwilioMedia(
        item.url,
        accountSid,
        authToken,
      )
      const mimeType = item.contentType || 'application/octet-stream'
      const ext = extensionForMime(mimeType)
      const name = sanitizeFilename(`mms-${item.index}.${ext}`)
      const path = `phone/messages/${messageId}/attachments`

      console.log(
        `[Phone MMS] Uploading media ${item.index + 1}/${media.length}: ${name} (${content.length} bytes, ${mimeType})`,
      )

      const result = await file.upload({
        content,
        name,
        mimeType,
        path,
      })

      processed.push({
        fileId: result.id,
        name,
        mimeType,
        size: content.length,
      })
    } catch (error) {
      console.error(`[Phone MMS] Failed to process media ${item.index}:`, error)
      // Continue with remaining media
    }
  }

  return processed
}
