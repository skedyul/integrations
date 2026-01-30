/**
 * Attachment Processing
 * =====================
 *
 * Handles downloading, uploading, and creating file records for email attachments.
 * This is provider-agnostic - works with any EmailProvider implementation.
 */

import { file } from 'skedyul'
import type { EmailProvider, InboundAttachment } from './email_provider'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ProcessedAttachment = {
  fileId: string
  name: string
  mimeType: string
  size: number
}

export type ProcessAttachmentsParams = {
  attachments: InboundAttachment[]
  messageId: string
  provider: EmailProvider
}

// ─────────────────────────────────────────────────────────────────────────────
// Attachment Processing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sanitize filename for storage (remove path components, special chars).
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^\.+/, '')
    .substring(0, 255)
}

/**
 * Process inbound email attachments.
 *
 * Downloads each attachment from the provider's storage URL,
 * uploads to S3 via the file.upload API, and returns file records.
 */
export async function processAttachments(
  params: ProcessAttachmentsParams,
): Promise<ProcessedAttachment[]> {
  const { attachments, messageId, provider } = params

  if (!attachments || attachments.length === 0) {
    return []
  }

  const processed: ProcessedAttachment[] = []

  for (let i = 0; i < attachments.length; i++) {
    const attachment = attachments[i]

    try {
      if (!attachment.url) {
        console.warn(`[Email] Attachment ${i + 1} missing URL, skipping`)
        continue
      }

      const filename = attachment.name || 'attachment'
      const sanitizedFilename = sanitizeFilename(filename)
      const contentType = attachment.contentType || 'application/octet-stream'

      // Download attachment content using provider
      console.log(`[Email] Downloading attachment ${i + 1}: ${filename}`)
      const content = await provider.fetchAttachment(attachment.url)

      // Use provided size or calculate from buffer
      const size = attachment.size > 0 ? attachment.size : content.length

      // Build storage path for organization
      const path = `email/messages/${messageId}/attachments`

      // Upload to S3 and create file record via skedyul SDK
      console.log(`[Email] Uploading attachment ${i + 1}: ${filename} (${size} bytes)`)
      const result = await file.upload({
        content,
        name: sanitizedFilename,
        mimeType: contentType,
        path,
      })

      processed.push({
        fileId: result.id,
        name: filename,
        mimeType: contentType,
        size,
      })

      console.log(`[Email] Processed attachment ${i + 1}: ${filename} -> ${result.id}`)
    } catch (error) {
      console.error(`[Email] Error processing attachment ${i + 1}:`, error)
      // Continue processing other attachments
    }
  }

  return processed
}
