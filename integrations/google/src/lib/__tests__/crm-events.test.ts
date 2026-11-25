import { beforeEach, describe, expect, it, jest } from '@jest/globals'

type Row = Record<string, unknown>

const list = jest.fn<
  (model: string, args: { filter: { google_event_id: { in: string[] } }; page: number; limit: number }) => Promise<{
    data: Row[]
    pagination: { page: number; total: number; hasMore: boolean; limit: number }
  }>
>()

jest.unstable_mockModule('skedyul', () => ({ instance: { list } }))

const { findCrmEventsByGoogleIds } = await import('../crm-events')

describe('findCrmEventsByGoogleIds', () => {
  beforeEach(() => {
    list.mockReset().mockImplementation(async (_model, args) => {
      const ids = args.filter.google_event_id.in
      return {
        data: ids.map((id) => ({ id: `ins_${id}`, google_event_id: id, updated_at: '2026-09-01T00:00:00Z' })),
        pagination: { page: 1, total: ids.length, hasMore: false, limit: args.limit },
      }
    })
  })

  it('reads rows in chunks of 50 and keys them by Google id', async () => {
    const ids = Array.from({ length: 120 }, (_, index) => `evt_${index}`)

    const rows = await findCrmEventsByGoogleIds([...ids, 'evt_0', ''])

    expect(list).toHaveBeenCalledTimes(3)
    expect(list.mock.calls.map((call) => call[1].filter.google_event_id.in.length)).toEqual([50, 50, 20])
    expect(rows.size).toBe(120)
    expect(rows.get('evt_7')).toEqual({
      id: 'ins_evt_7',
      google_event_id: 'evt_7',
      updated_at: '2026-09-01T00:00:00Z',
    })
  })

  it('follows pagination within a chunk', async () => {
    list
      .mockResolvedValueOnce({
        data: [{ id: 'ins_a', google_event_id: 'a' }],
        pagination: { page: 1, total: 2, hasMore: true, limit: 50 },
      })
      .mockResolvedValueOnce({
        data: [{ id: 'ins_b', google_event_id: 'b', updated_at: null }],
        pagination: { page: 2, total: 2, hasMore: false, limit: 50 },
      })

    const rows = await findCrmEventsByGoogleIds(['a', 'b'])

    expect(list.mock.calls.map((call) => call[1].page)).toEqual([1, 2])
    expect([...rows.keys()]).toEqual(['a', 'b'])
  })

  it('reads the workplace handle when the map renamed updated_at', async () => {
    list.mockResolvedValueOnce({
      data: [{ id: 'ins_a', google_event_id: 'a', updatedAt: 'ignored', updated_at: '2026-09-02T00:00:00Z' }],
      pagination: { page: 1, total: 1, hasMore: false, limit: 50 },
    })

    const rows = await findCrmEventsByGoogleIds(['a'])

    expect(rows.get('a')?.updated_at).toBe('2026-09-02T00:00:00Z')
  })

  it('makes no request for an empty list', async () => {
    await expect(findCrmEventsByGoogleIds([])).resolves.toEqual(new Map())
    expect(list).not.toHaveBeenCalled()
  })
})
