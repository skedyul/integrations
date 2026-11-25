import { beforeEach, describe, expect, it, jest } from '@jest/globals'

type Event = { id?: string; status?: string; etag?: string; summary?: string }

const insertGoogleCalendarEvent = jest.fn<(...args: unknown[]) => Promise<Event>>()
const patchGoogleCalendarEvent = jest.fn<(...args: unknown[]) => Promise<Event>>()
const getGoogleCalendarEvent = jest.fn<(...args: unknown[]) => Promise<Event>>()
const deleteGoogleCalendarEvent = jest.fn<(...args: unknown[]) => Promise<void>>()
const moveGoogleCalendarEvent = jest.fn<(...args: unknown[]) => Promise<Event>>()

jest.unstable_mockModule('../client.ts', () => ({
  insertGoogleCalendarEvent,
  patchGoogleCalendarEvent,
  getGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  moveGoogleCalendarEvent,
}))

const {
  deleteEventIdempotent,
  insertEventIdempotent,
  patchEventWithEtag,
  patchSeriesInstance,
} = await import('../writes')

function httpError(status: number, reason?: string): Error {
  return Object.assign(new Error(`HTTP ${status}`), {
    status,
    response: {
      status,
      data: reason ? { error: { errors: [{ reason }] } } : undefined,
    },
  })
}

const auth = {} as never

describe('insertEventIdempotent', () => {
  beforeEach(() => {
    insertGoogleCalendarEvent.mockReset()
    patchGoogleCalendarEvent.mockReset()
    getGoogleCalendarEvent.mockReset()
  })

  it('inserts with the client id', async () => {
    insertGoogleCalendarEvent.mockResolvedValue({ id: 'skabc', status: 'confirmed' })

    const result = await insertEventIdempotent(auth, 'cal', { summary: 'A' }, { eventId: 'skabc' })

    expect(result).toEqual({ event: { id: 'skabc', status: 'confirmed' }, created: true })
    expect(insertGoogleCalendarEvent).toHaveBeenCalledWith(auth, 'cal', { summary: 'A' }, {
      eventId: 'skabc',
    })
  })

  it('treats 409 as already created and reads the existing event', async () => {
    insertGoogleCalendarEvent.mockRejectedValue(httpError(409, 'duplicate'))
    getGoogleCalendarEvent.mockResolvedValue({ id: 'skabc', status: 'confirmed', etag: '"e1"' })

    const result = await insertEventIdempotent(auth, 'cal', { summary: 'A' }, { eventId: 'skabc' })

    expect(result).toEqual({
      event: { id: 'skabc', status: 'confirmed', etag: '"e1"' },
      created: false,
    })
    expect(patchGoogleCalendarEvent).not.toHaveBeenCalled()
  })

  it('restores a cancelled event that already used the id', async () => {
    insertGoogleCalendarEvent.mockRejectedValue(httpError(409))
    getGoogleCalendarEvent.mockResolvedValue({ id: 'skabc', status: 'cancelled' })
    patchGoogleCalendarEvent.mockResolvedValue({ id: 'skabc', status: 'confirmed' })

    const result = await insertEventIdempotent(auth, 'cal', { summary: 'A' }, { eventId: 'skabc' })

    expect(result.event.status).toBe('confirmed')
    expect(patchGoogleCalendarEvent).toHaveBeenCalledWith(auth, 'cal', 'skabc', {
      summary: 'A',
      status: 'confirmed',
    })
  })

  it('rethrows a 409 when no client id was sent', async () => {
    insertGoogleCalendarEvent.mockRejectedValue(httpError(409))
    await expect(insertEventIdempotent(auth, 'cal', { summary: 'A' }, {})).rejects.toThrow(
      'HTTP 409',
    )
  })
})

describe('patchEventWithEtag', () => {
  beforeEach(() => {
    patchGoogleCalendarEvent.mockReset()
    getGoogleCalendarEvent.mockReset()
  })

  it('sends If-Match with the stored etag', async () => {
    patchGoogleCalendarEvent.mockResolvedValue({ id: 'evt', etag: '"e2"' })

    await patchEventWithEtag(auth, 'cal', 'evt', { summary: 'B' }, { etag: '"e1"' })

    expect(patchGoogleCalendarEvent).toHaveBeenCalledWith(auth, 'cal', 'evt', { summary: 'B' }, {
      ifMatch: '"e1"',
    })
  })

  it('on 412 re-GETs, re-applies the patch with the fresh etag and retries once', async () => {
    patchGoogleCalendarEvent
      .mockRejectedValueOnce(httpError(412, 'conditionNotMet'))
      .mockResolvedValueOnce({ id: 'evt', etag: '"e3"', summary: 'B' })
    getGoogleCalendarEvent.mockResolvedValue({ id: 'evt', etag: '"e2"' })

    const result = await patchEventWithEtag(auth, 'cal', 'evt', { summary: 'B' }, { etag: '"e1"' })

    expect(result).toEqual({ id: 'evt', etag: '"e3"', summary: 'B' })
    expect(patchGoogleCalendarEvent).toHaveBeenCalledTimes(2)
    expect(patchGoogleCalendarEvent.mock.calls[1]).toEqual([
      auth,
      'cal',
      'evt',
      { summary: 'B' },
      { ifMatch: '"e2"' },
    ])
  })

  it('gives up after one retry', async () => {
    patchGoogleCalendarEvent.mockRejectedValue(httpError(412))
    getGoogleCalendarEvent.mockResolvedValue({ id: 'evt', etag: '"e2"' })

    await expect(
      patchEventWithEtag(auth, 'cal', 'evt', { summary: 'B' }, { etag: '"e1"' }),
    ).rejects.toThrow('HTTP 412')
    expect(patchGoogleCalendarEvent).toHaveBeenCalledTimes(2)
  })

  it('patches without If-Match when no etag is stored', async () => {
    patchGoogleCalendarEvent.mockResolvedValue({ id: 'evt' })
    await patchEventWithEtag(auth, 'cal', 'evt', { summary: 'B' }, {})
    expect(patchGoogleCalendarEvent.mock.calls[0]?.[4]).toEqual({ ifMatch: null })
  })
})

describe('patchSeriesInstance', () => {
  const sleep = jest.fn(async (_ms: number) => undefined)

  beforeEach(() => {
    patchGoogleCalendarEvent.mockReset()
    sleep.mockClear()
  })

  it('never sends recurrence on an occurrence', async () => {
    patchGoogleCalendarEvent.mockResolvedValue({ id: 'abc_20260817' })

    await patchSeriesInstance(auth, 'cal', 'abc_20260817', {
      summary: 'Moved',
      recurrence: ['RRULE:FREQ=DAILY'],
    })

    expect(patchGoogleCalendarEvent.mock.calls[0]?.[3]).toEqual({
      summary: 'Moved',
      recurrence: undefined,
    })
  })

  it('retries 404s while the series write is still in flight', async () => {
    patchGoogleCalendarEvent
      .mockRejectedValueOnce(httpError(404))
      .mockResolvedValueOnce({ id: 'abc_20260817' })

    const result = await patchSeriesInstance(
      auth,
      'cal',
      'abc_20260817',
      { summary: 'Moved' },
      { retryDelaysMs: [5, 10], sleep },
    )

    expect(result).toEqual({ id: 'abc_20260817' })
    expect(sleep).toHaveBeenCalledWith(5)
  })

  it('fails after the bounded retries', async () => {
    patchGoogleCalendarEvent.mockRejectedValue(httpError(404))

    await expect(
      patchSeriesInstance(auth, 'cal', 'abc_x', { summary: 'Moved' }, {
        retryDelaysMs: [1, 1],
        sleep,
      }),
    ).rejects.toThrow('HTTP 404')
    expect(patchGoogleCalendarEvent).toHaveBeenCalledTimes(3)
  })

  it('returns null when cancelling an occurrence that is already gone', async () => {
    patchGoogleCalendarEvent.mockRejectedValue(httpError(410))

    const result = await patchSeriesInstance(
      auth,
      'cal',
      'abc_x',
      { status: 'cancelled' },
      { sleep },
    )

    expect(result).toBeNull()
    expect(sleep).not.toHaveBeenCalled()
  })
})

describe('deleteEventIdempotent', () => {
  beforeEach(() => {
    deleteGoogleCalendarEvent.mockReset()
  })

  it('passes sendUpdates through', async () => {
    deleteGoogleCalendarEvent.mockResolvedValue(undefined)

    await expect(deleteEventIdempotent(auth, 'cal', 'evt', 'none')).resolves.toEqual({
      alreadyDeleted: false,
    })
    expect(deleteGoogleCalendarEvent).toHaveBeenCalledWith(auth, 'cal', 'evt', {
      sendUpdates: 'none',
    })
  })

  it.each([404, 410])('treats %i as already deleted', async (status) => {
    deleteGoogleCalendarEvent.mockRejectedValue(httpError(status))
    await expect(deleteEventIdempotent(auth, 'cal', 'evt')).resolves.toEqual({
      alreadyDeleted: true,
    })
  })

  it('rethrows other errors', async () => {
    deleteGoogleCalendarEvent.mockRejectedValue(httpError(500))
    await expect(deleteEventIdempotent(auth, 'cal', 'evt')).rejects.toThrow('HTTP 500')
  })
})
