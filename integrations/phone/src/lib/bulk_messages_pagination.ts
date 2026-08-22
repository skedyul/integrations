export const TWILIO_BULK_MESSAGES_URL = 'https://comms.twilio.com/v1/Messages'
export const TWILIO_BULK_MESSAGES_PAGE_SIZE = 200

export function isAbsoluteHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim())
}

export function buildBulkMessagesPageUrl(input: {
  operationId: string
  pageToken?: string | null
  pageSize?: number
}): string {
  const url = new URL(TWILIO_BULK_MESSAGES_URL)
  url.searchParams.set('operation_id', input.operationId)
  url.searchParams.set(
    'pageSize',
    String(input.pageSize ?? TWILIO_BULK_MESSAGES_PAGE_SIZE),
  )
  const pageToken = input.pageToken?.trim()
  if (pageToken) {
    url.searchParams.set('pageToken', pageToken)
  }
  return url.toString()
}

/**
 * Twilio Comms List Messages returns `pagination.next` as a page token,
 * not a URL. Older/alternate payloads may still include an absolute
 * `meta.next_page_url`.
 */
export function resolveBulkMessagesNextPageUrl(input: {
  operationId: string
  paginationNext?: string | null
  nextPageUrl?: string | null
  pageSize?: number
}): string | null {
  const next = input.paginationNext?.trim() || input.nextPageUrl?.trim() || ''
  if (!next) {
    return null
  }
  if (isAbsoluteHttpUrl(next)) {
    return next
  }
  return buildBulkMessagesPageUrl({
    operationId: input.operationId,
    pageToken: next,
    pageSize: input.pageSize,
  })
}
