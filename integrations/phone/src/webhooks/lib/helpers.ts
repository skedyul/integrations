import { Buffer } from 'buffer'
import { URLSearchParams } from 'url'
import type { WebhookRequest } from 'skedyul'

/**
 * Get a header value from the request headers (case-insensitive).
 */
export const getHeaderValue = (
  headers: WebhookRequest['headers'],
  key: string,
): string | undefined => {
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

/**
 * Serialize the request body to a string for signature validation.
 */
export const serializeBody = (body: unknown): string => {
  if (!body) {
    return ''
  }

  if (typeof body === 'string') {
    return body
  }

  if (Buffer.isBuffer(body)) {
    return body.toString('utf-8')
  }

  if (body instanceof ArrayBuffer) {
    return Buffer.from(body).toString('utf-8')
  }

  if (ArrayBuffer.isView(body)) {
    return Buffer.from(
      (body as { buffer: ArrayBuffer }).buffer,
    ).toString('utf-8')
  }

  if (body instanceof URLSearchParams) {
    return body.toString()
  }

  if (typeof body === 'object') {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(body)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          params.append(key, String(item ?? ''))
        }
      } else {
        params.append(key, String(value ?? ''))
      }
    }

    return params.toString()
  }

  return String(body)
}
