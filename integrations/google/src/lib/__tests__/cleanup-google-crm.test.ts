import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const deleteMany = jest.fn<
  () => Promise<{ deleted: string[]; errors: Array<{ index: number; error: string }> }>
>()

jest.unstable_mockModule('skedyul', () => ({
  instance: { deleteMany },
}))

const { deleteGoogleKeyedCrmRows, GOOGLE_KEYED_CRM_ENTITIES } = await import(
  '../cleanup-google-crm'
)

describe('deleteGoogleKeyedCrmRows', () => {
  const log = {
    info: jest.fn(),
    warn: jest.fn(),
  }

  beforeEach(() => {
    deleteMany.mockReset()
    log.info.mockReset()
    log.warn.mockReset()
  })

  it('deletes attendee, event, then calendar rows that have a Google match key', async () => {
    deleteMany.mockResolvedValue({ deleted: ['ins_1'], errors: [] })

    const result = await deleteGoogleKeyedCrmRows(log)

    expect(GOOGLE_KEYED_CRM_ENTITIES.map((row) => row.entity)).toEqual([
      'attendee',
      'calendar_event',
      'calendar',
    ])
    expect(deleteMany.mock.calls).toEqual([
      ['attendee', { filter: { event_attendee_key: { isNotEmpty: true } } }],
      ['calendar_event', { filter: { google_event_id: { isNotEmpty: true } } }],
      ['calendar', { filter: { google_calendar_id: { isNotEmpty: true } } }],
    ])
    expect(result.deletedByEntity).toEqual({
      attendee: 1,
      calendar_event: 1,
      calendar: 1,
    })
  })

  it('continues when an entity is unmapped', async () => {
    deleteMany
      .mockRejectedValueOnce(new Error('attendee not mapped'))
      .mockResolvedValueOnce({ deleted: ['evt_1', 'evt_2'], errors: [] })
      .mockResolvedValueOnce({ deleted: [], errors: [] })

    const result = await deleteGoogleKeyedCrmRows(log)

    expect(result.deletedByEntity).toEqual({
      attendee: 0,
      calendar_event: 2,
      calendar: 0,
    })
    expect(log.warn).toHaveBeenCalled()
  })
})
