/**
 * Mailgun inbound helpers (store(notify) webhooks).
 *
 * Attachment bytes are not in the notify payload — only metadata + URLs.
 * Fetching those URLs requires Basic auth (`api:<MAILGUN_API_KEY>`).
 */

import type { InboundAttachment } from '../email_provider'

export const MAILGUN_ATTACHMENT_FETCH_TIMEOUT_MS = 60_000

export function parseMailgunFormBody(body: unknown): Record<string, unknown> {
  if (typeof body === 'string') {
    const params = new URLSearchParams(body)
    const result: Record<string, unknown> = {}
    for (const [key, value] of params.entries()) {
      result[key] = value
    }
    return result
  }
  if (typeof body === 'object' && body !== null) {
    return body as Record<string, unknown>
  }
  return {}
}

type MailgunAttachmentJson = {
  name?: unknown
  'content-type'?: unknown
  content_type?: unknown
  contentType?: unknown
  size?: unknown
  url?: unknown
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function asSize(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed
    }
  }
  return 0
}

export function parseMailgunAttachments(raw: unknown): InboundAttachment[] {
  if (raw == null || raw === '') {
    return []
  }

  let parsed: unknown = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    } catch (error) {
      console.error('[Mailgun] Failed to parse attachments JSON:', error)
      return []
    }
  }

  if (!Array.isArray(parsed)) {
    console.warn('[Mailgun] attachments field is not an array:', typeof parsed)
    return []
  }

  const attachments: InboundAttachment[] = []
  for (const item of parsed) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const att = item as MailgunAttachmentJson
    const url = asNonEmptyString(att.url)
    if (!url) {
      console.warn('[Mailgun] Skipping attachment without url:', att.name)
      continue
    }
    attachments.push({
      name: asNonEmptyString(att.name) ?? 'attachment',
      contentType:
        asNonEmptyString(att['content-type']) ??
        asNonEmptyString(att.content_type) ??
        asNonEmptyString(att.contentType) ??
        'application/octet-stream',
      size: asSize(att.size),
      url,
    })
  }

  return attachments
}

export function mailgunBasicAuthHeader(apiKey: string): string {
  return Buffer.from(`api:${apiKey}`, 'utf-8').toString('base64')
}

export async function fetchMailgunAttachment(
  url: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs: number = MAILGUN_ATTACHMENT_FETCH_TIMEOUT_MS,
): Promise<Buffer> {
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${mailgunBasicAuthHeader(apiKey)}`,
    },
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch attachment: ${response.status} ${response.statusText}`,
    )
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
