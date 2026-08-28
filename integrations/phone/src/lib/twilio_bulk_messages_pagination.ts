export const TWILIO_BULK_MESSAGES_URL = 'https://comms.twilio.com/v1/Messages'
export const TWILIO_BULK_MESSAGES_PAGE_SIZE = 1000

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

export function buildFirstMessagesPageUrl(operationId: string): string {
  const url = new URL(TWILIO_BULK_MESSAGES_URL)
  url.searchParams.set('operation_id', operationId)
  url.searchParams.set('pageSize', String(TWILIO_BULK_MESSAGES_PAGE_SIZE))
  return url.toString()
}

/**
 * Twilio Comms List Messages returns `pagination.next` as a page token, not a
 * URL. Only treat a value as a URL when it is already http(s).
 */
export function resolveNextMessagesPageUrl(input: {
  operationId: string
  paginationNext?: string | null
  nextPageUrl?: string | null
}): string | null {
  const candidates = [input.nextPageUrl, input.paginationNext]
    .map((value) => value?.trim() ?? '')
    .filter((value) => value.length > 0)

  if (candidates.length === 0) {
    return null
  }

  const urlCandidate = candidates.find(isHttpUrl)
  if (urlCandidate) {
    return urlCandidate
  }

  const token = candidates[0]
  const url = new URL(TWILIO_BULK_MESSAGES_URL)
  url.searchParams.set('operation_id', input.operationId)
  url.searchParams.set('pageToken', token)
  url.searchParams.set('pageSize', String(TWILIO_BULK_MESSAGES_PAGE_SIZE))
  return url.toString()
}
