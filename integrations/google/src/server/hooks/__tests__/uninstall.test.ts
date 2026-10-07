import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const deleteGoogleKeyedCrmRows = jest.fn(async () => ({
  deletedByEntity: { attendee: 0, calendar_event: 0, calendar: 5 },
}))
const revokeGoogleRefreshToken = jest.fn(async () => undefined)

jest.unstable_mockModule('../../../lib/cleanup-google-crm.ts', () => ({
  deleteGoogleKeyedCrmRows,
}))

jest.unstable_mockModule('../../../lib/google_client.ts', () => ({
  revokeGoogleRefreshToken,
}))

const { default: uninstall } = await import('../uninstall')

describe('google uninstall hook', () => {
  beforeEach(() => {
    deleteGoogleKeyedCrmRows.mockClear()
    revokeGoogleRefreshToken.mockClear()
  })

  it('revokes OAuth then deletes Google-keyed CRM rows', async () => {
    const log = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }

    await uninstall({
      env: { GOOGLE_REFRESH_TOKEN: 'refresh' },
      log,
    } as never)

    expect(revokeGoogleRefreshToken).toHaveBeenCalledWith({
      GOOGLE_REFRESH_TOKEN: 'refresh',
    })
    expect(deleteGoogleKeyedCrmRows).toHaveBeenCalledWith(log)
  })
})
