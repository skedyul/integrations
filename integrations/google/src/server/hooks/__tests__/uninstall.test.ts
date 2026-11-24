import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { GoogleCalendarRecord } from '../../../events/types'

const calls: string[] = []
const cleanupGoogleCrmRows = jest.fn(async () => {
  calls.push('cleanup')
  return { deletedByEntity: {}, strippedEvents: 0, keptCalendars: 0 }
})
const revokeGoogleRefreshToken = jest.fn(async () => {
  calls.push('revoke')
})
const getOAuthClientWithInlineRefresh = jest.fn(async () => ({ client: 'oauth' }))
const listCrmCalendarRecords = jest.fn<() => Promise<GoogleCalendarRecord[]>>()
const stopCalendarWatch = jest.fn(async (_auth: unknown, options: { channelId: string }) => {
  calls.push(`stop:${options.channelId}`)
})

jest.unstable_mockModule('../../../lib/cleanup-google-crm.ts', () => ({ cleanupGoogleCrmRows }))
jest.unstable_mockModule('../../../lib/google_client.ts', () => ({
  revokeGoogleRefreshToken,
  getOAuthClientWithInlineRefresh,
}))
jest.unstable_mockModule('../../../lib/crm-calendars.ts', () => ({ listCrmCalendarRecords }))
jest.unstable_mockModule('../../../services/calendar/watch.ts', () => ({ stopCalendarWatch }))

const { default: uninstall } = await import('../uninstall')

describe('google uninstall hook', () => {
  const log = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }

  beforeEach(() => {
    calls.length = 0
    cleanupGoogleCrmRows.mockClear()
    revokeGoogleRefreshToken.mockClear()
    stopCalendarWatch.mockClear()
    listCrmCalendarRecords.mockReset().mockResolvedValue([
      { id: 'a', calendar_id: 'a', watch_channel_id: 'ch_a', watch_resource_id: 'res_a' },
      { id: 'b', calendar_id: 'b' },
    ])
  })

  it('stops push channels and schedules before revoking OAuth, then cleans up CRM rows', async () => {
    await uninstall({ env: { GOOGLE_REFRESH_TOKEN: 'refresh' }, log } as never)

    expect(stopCalendarWatch).toHaveBeenCalledWith(
      { client: 'oauth' },
      { channelId: 'ch_a', resourceId: 'res_a' },
    )
    expect(calls).toEqual(['stop:ch_a', 'revoke', 'cleanup'])
    expect(revokeGoogleRefreshToken).toHaveBeenCalledWith({ GOOGLE_REFRESH_TOKEN: 'refresh' })
    expect(cleanupGoogleCrmRows).toHaveBeenCalledWith(log)
  })

  it('still cleans up when channels cannot be listed', async () => {
    listCrmCalendarRecords.mockRejectedValue(new Error('calendar not mapped'))

    await uninstall({ env: {}, log } as never)

    expect(stopCalendarWatch).not.toHaveBeenCalled()
    expect(revokeGoogleRefreshToken).not.toHaveBeenCalled()
    expect(cleanupGoogleCrmRows).toHaveBeenCalled()
  })
})
