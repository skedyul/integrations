import { Buffer } from 'node:buffer'
import type { WebhookRequest } from 'skedyul'

export function getHeaderValue(
  headers: WebhookRequest['headers'],
  key: string,
): string | undefined {
  const exact = headers[key]
  if (exact) {
    return Array.isArray(exact) ? exact[0] : exact
  }

  const match = Object.entries(headers).find(
    ([headerKey]) => headerKey.toLowerCase() === key.toLowerCase(),
  )

  if (!match) {
    return undefined
  }

  const value = match[1]
  return Array.isArray(value) ? value[0] : value
}

export function getRawBodyString(request: WebhookRequest): string {
  if (request.rawBody) {
    return request.rawBody.toString('utf8')
  }

  if (typeof request.body === 'string') {
    return request.body
  }

  if (Buffer.isBuffer(request.body)) {
    return request.body.toString('utf8')
  }

  if (request.body == null) {
    return ''
  }

  return JSON.stringify(request.body)
}

export function parseJsonBody(request: WebhookRequest): Record<string, unknown> | null {
  const raw = getRawBodyString(request)
  if (!raw.trim()) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed != null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    return null
  } catch {
    return null
  }
}
