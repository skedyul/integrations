import { describe, expect, it } from '@jest/globals'
import {
  TWILIO_BULK_MESSAGES_PAGE_SIZE,
  TWILIO_BULK_MESSAGES_URL,
  buildFirstMessagesPageUrl,
  resolveNextMessagesPageUrl,
} from './twilio_bulk_messages_pagination'

const OPERATION_ID = 'comms_operation_01m13eryjdf74aw86mjr7j68dq'

describe('buildFirstMessagesPageUrl', () => {
  it('requests pageSize 1000 with the camelCase operationId query', () => {
    expect(buildFirstMessagesPageUrl(OPERATION_ID)).toBe(
      `${TWILIO_BULK_MESSAGES_URL}?operationId=${OPERATION_ID}&pageSize=${TWILIO_BULK_MESSAGES_PAGE_SIZE}`,
    )
  })
})

describe('resolveNextMessagesPageUrl', () => {
  it('returns null when both next values are empty', () => {
    expect(
      resolveNextMessagesPageUrl({
        operationId: OPERATION_ID,
        paginationNext: null,
        nextPageUrl: null,
      }),
    ).toBeNull()
    expect(
      resolveNextMessagesPageUrl({
        operationId: OPERATION_ID,
        paginationNext: '  ',
        nextPageUrl: '',
      }),
    ).toBeNull()
  })

  it('uses an absolute next_page_url as-is', () => {
    const nextPageUrl = `${TWILIO_BULK_MESSAGES_URL}?operationId=${OPERATION_ID}&pageToken=abc`
    expect(
      resolveNextMessagesPageUrl({
        operationId: OPERATION_ID,
        paginationNext: 'W3CjOffcQq08V0sV7ndMQV6f4TLk4aXnmlH4HKBd81t08Z-o',
        nextPageUrl,
      }),
    ).toBe(nextPageUrl)
  })

  it('uses pagination.next when it is already an http URL', () => {
    const paginationNext = `${TWILIO_BULK_MESSAGES_URL}?pageToken=from-next`
    expect(
      resolveNextMessagesPageUrl({
        operationId: OPERATION_ID,
        paginationNext,
        nextPageUrl: null,
      }),
    ).toBe(paginationNext)
  })

  it('builds a pageToken URL from an opaque pagination.next token', () => {
    const token =
      'W3CjOffcQq08V0sV7ndMQV6f4TLk4aXnmlH4HKBd81t08Z-o8-aAgSYGp6XdAeWFyJsgzU9zPvVwShpHqdQ'
    expect(
      resolveNextMessagesPageUrl({
        operationId: OPERATION_ID,
        paginationNext: token,
        nextPageUrl: null,
      }),
    ).toBe(
      `${TWILIO_BULK_MESSAGES_URL}?operationId=${OPERATION_ID}&pageToken=${encodeURIComponent(token)}&pageSize=${TWILIO_BULK_MESSAGES_PAGE_SIZE}`,
    )
  })
})
