import { describe, expect, it } from '@jest/globals'
import {
  TWILIO_BULK_MESSAGES_PAGE_SIZE,
  TWILIO_BULK_MESSAGES_URL,
  buildBulkMessagesPageUrl,
  isAbsoluteHttpUrl,
  resolveBulkMessagesNextPageUrl,
} from './bulk_messages_pagination'

const OPERATION_ID = 'comms_operation_01m0m3981sfj2ahj9xnkq9whkb'

describe('isAbsoluteHttpUrl', () => {
  it('accepts http and https URLs', () => {
    expect(isAbsoluteHttpUrl('https://comms.twilio.com/v1/Messages')).toBe(true)
    expect(isAbsoluteHttpUrl('http://example.test/page')).toBe(true)
  })

  it('rejects page tokens and empty values', () => {
    expect(isAbsoluteHttpUrl('T_vQhc7rUCSWm0G2VgU6o0DA16icb-ILbYt')).toBe(
      false,
    )
    expect(isAbsoluteHttpUrl('')).toBe(false)
    expect(isAbsoluteHttpUrl('  ')).toBe(false)
  })
})

describe('buildBulkMessagesPageUrl', () => {
  it('builds the first page with operation_id and default pageSize', () => {
    const url = new URL(buildBulkMessagesPageUrl({ operationId: OPERATION_ID }))
    expect(`${url.origin}${url.pathname}`).toBe(TWILIO_BULK_MESSAGES_URL)
    expect(url.searchParams.get('operation_id')).toBe(OPERATION_ID)
    expect(url.searchParams.get('pageSize')).toBe(
      String(TWILIO_BULK_MESSAGES_PAGE_SIZE),
    )
    expect(url.searchParams.get('pageToken')).toBeNull()
  })

  it('appends pageToken for subsequent pages', () => {
    const url = new URL(
      buildBulkMessagesPageUrl({
        operationId: OPERATION_ID,
        pageToken: 'T_nextPageToken',
        pageSize: 200,
      }),
    )
    expect(url.searchParams.get('pageToken')).toBe('T_nextPageToken')
    expect(url.searchParams.get('pageSize')).toBe('200')
  })
})

describe('resolveBulkMessagesNextPageUrl', () => {
  it('stops when next is empty', () => {
    expect(
      resolveBulkMessagesNextPageUrl({
        operationId: OPERATION_ID,
        paginationNext: null,
        nextPageUrl: null,
      }),
    ).toBeNull()
    expect(
      resolveBulkMessagesNextPageUrl({
        operationId: OPERATION_ID,
        paginationNext: '  ',
      }),
    ).toBeNull()
  })

  it('treats pagination.next as a page token', () => {
    const next = resolveBulkMessagesNextPageUrl({
      operationId: OPERATION_ID,
      paginationNext: 'T_vQhc7rUCSWm0G2VgU6o0DA16icb-ILbYt',
    })
    expect(next).not.toBeNull()
    const url = new URL(next!)
    expect(`${url.origin}${url.pathname}`).toBe(TWILIO_BULK_MESSAGES_URL)
    expect(url.searchParams.get('operation_id')).toBe(OPERATION_ID)
    expect(url.searchParams.get('pageToken')).toBe(
      'T_vQhc7rUCSWm0G2VgU6o0DA16icb-ILbYt',
    )
  })

  it('uses an absolute pagination.next URL as-is', () => {
    const absolute =
      'https://comms.twilio.com/v1/Messages?operation_id=ops_1&pageToken=abc'
    expect(
      resolveBulkMessagesNextPageUrl({
        operationId: OPERATION_ID,
        paginationNext: absolute,
      }),
    ).toBe(absolute)
  })

  it('uses meta.next_page_url when it is an absolute URL', () => {
    const absolute =
      'https://comms.twilio.com/v1/Messages?operation_id=ops_1&pageToken=from-meta'
    expect(
      resolveBulkMessagesNextPageUrl({
        operationId: OPERATION_ID,
        paginationNext: null,
        nextPageUrl: absolute,
      }),
    ).toBe(absolute)
  })

  it('prefers pagination.next over next_page_url', () => {
    const next = resolveBulkMessagesNextPageUrl({
      operationId: OPERATION_ID,
      paginationNext: 'token-from-pagination',
      nextPageUrl: 'https://comms.twilio.com/v1/Messages?pageToken=meta',
    })
    const url = new URL(next!)
    expect(url.searchParams.get('pageToken')).toBe('token-from-pagination')
  })
})
