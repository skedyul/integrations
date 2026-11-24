import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { GoogleCalendarRecord } from '../../events/types'

type Row = Record<string, unknown>

const instanceUpdate = jest.fn<(model: string, id: string, data: Row) => Promise<Row>>()
const instanceList = jest.fn(async () => ({
  data: [] as Row[],
  pagination: { page: 1, total: 0, hasMore: false, limit: 1 },
}))
const webhookList = jest.fn(async () => ({
  webhooks: [{ id: 'whkr_1', name: 'calendar_push', url: 'https://hooks/calendar_push', context: null, createdAt: '', expiresAt: null }],
}))
const startCalendarWatch = jest.fn<
  (auth: unknown, options: { calendarId: string; webhookUrl: string; token?: string }) => Promise<{
    channelId: string
    resourceId: string
    expiration: string | null
    token: string
  }>
>()
const stopCalendarWatch = jest.fn(async (_auth: unknown, _options: unknown) => undefined)

jest.unstable_mockModule('skedyul', async () => {
  const actual = await jest.requireActual<typeof import('skedyul')>('skedyul')
  return {
    ...actual,
    instance: { ...actual.instance, update: instanceUpdate, list: instanceList },
    webhook: { ...actual.webhook, list: webhookList },
  }
})

jest.unstable_mockModule('../../services/calendar/watch.ts', () => ({
  startCalendarWatch,
  stopCalendarWatch,
  // Same rule as the real helper (covered in watch.test.ts).
  watchNeedsRenewal: (expiration: string | null | undefined, now: number = Date.now()) =>
    !expiration || Date.parse(expiration) <= now + 24 * 60 * 60 * 1000,
}))

const {
  ensureCalendarWatch,
  reconcileCalendarWatches,
  removeCalendarWatch,
  watchTokensMatch,
} = await import('../calendar_link')

const NOW = Date.parse('2026-09-01T00:00:00.000Z')
const DAY = 24 * 60 * 60 * 1000
const auth = {} as never

function record(overrides: Partial<GoogleCalendarRecord> = {}): GoogleCalendarRecord {
  return {
    id: 'ins_cal',
    calendar_id: 'primary',
    crm_instance_id: 'ins_cal',
    sync_enabled: true,
    ...overrides,
  }
}

const watched = {
  watch_channel_id: 'ch_old',
  watch_resource_id: 'res_old',
  watch_token: 'secret_old',
}

describe('ensureCalendarWatch', () => {
  beforeEach(() => {
    instanceUpdate.mockReset().mockResolvedValue({ id: 'ins_cal' })
    startCalendarWatch.mockReset().mockImplementation(async (_auth, options) => ({
      channelId: 'ch_new',
      resourceId: 'res_new',
      expiration: new Date(NOW + 7 * DAY).toISOString(),
      token: options.token ?? 'missing',
    }))
    stopCalendarWatch.mockClear()
  })

  it('opens a channel with a random secret token (not the calendar id) and stores it', async () => {
    const next = await ensureCalendarWatch(auth, record(), NOW)

    const token = startCalendarWatch.mock.calls[0]?.[1].token
    expect(token).toMatch(/^[0-9a-f]{64}$/)
    expect(token).not.toBe('primary')
    expect(startCalendarWatch.mock.calls[0]?.[1].webhookUrl).toBe('https://hooks/calendar_push')
    expect(instanceUpdate).toHaveBeenCalledWith('calendar', 'ins_cal', {
      watch_channel_id: 'ch_new',
      watch_resource_id: 'res_new',
      watch_expiration: new Date(NOW + 7 * DAY).toISOString(),
      watch_token: token,
    })
    expect(next.watch_channel_id).toBe('ch_new')
  })

  it('keeps a stored channel that is not close to expiry', async () => {
    const current = record({
      ...watched,
      watch_expiration: new Date(NOW + 3 * DAY).toISOString(),
    })

    await expect(ensureCalendarWatch(auth, current, NOW)).resolves.toBe(current)
    expect(startCalendarWatch).not.toHaveBeenCalled()
  })

  it('renews a channel expiring within 24h: new channel first, then stops the old one', async () => {
    const expiring = record({
      ...watched,
      watch_expiration: new Date(NOW + 2 * 60 * 60 * 1000).toISOString(),
    })

    await ensureCalendarWatch(auth, expiring, NOW)

    expect(startCalendarWatch).toHaveBeenCalledTimes(1)
    expect(stopCalendarWatch).toHaveBeenCalledWith(auth, {
      channelId: 'ch_old',
      resourceId: 'res_old',
    })
    expect(startCalendarWatch.mock.invocationCallOrder[0]).toBeLessThan(
      stopCalendarWatch.mock.invocationCallOrder[0] ?? 0,
    )
  })

  it('stops the new channel again when the calendar has no CRM row to store it on', async () => {
    instanceList.mockResolvedValueOnce({
      data: [],
      pagination: { page: 1, total: 0, hasMore: false, limit: 1 },
    })

    await expect(
      ensureCalendarWatch(auth, record({ crm_instance_id: null }), NOW),
    ).rejects.toThrow('has no CRM calendar row')
    expect(stopCalendarWatch).toHaveBeenCalledWith(auth, {
      channelId: 'ch_new',
      resourceId: 'res_new',
    })
  })
})

describe('removeCalendarWatch', () => {
  beforeEach(() => {
    instanceUpdate.mockReset().mockResolvedValue({ id: 'ins_cal' })
    stopCalendarWatch.mockClear()
  })

  it('stops the channel and clears the stored watch fields', async () => {
    await removeCalendarWatch(auth, record(watched))

    expect(stopCalendarWatch).toHaveBeenCalledWith(auth, {
      channelId: 'ch_old',
      resourceId: 'res_old',
    })
    expect(instanceUpdate).toHaveBeenCalledWith('calendar', 'ins_cal', {
      watch_channel_id: null,
      watch_resource_id: null,
      watch_expiration: null,
      watch_token: null,
    })
  })
})

describe('reconcileCalendarWatches', () => {
  beforeEach(() => {
    instanceUpdate.mockReset().mockResolvedValue({ id: 'ins_cal' })
    startCalendarWatch.mockReset().mockImplementation(async (_auth, options) => ({
      channelId: `ch_${options.calendarId}`,
      resourceId: 'res',
      expiration: new Date(NOW + 7 * DAY).toISOString(),
      token: options.token ?? '',
    }))
    stopCalendarWatch.mockClear()
  })

  it('creates, renews, keeps and stops channels according to each calendar', async () => {
    const summary = await reconcileCalendarWatches(
      auth,
      [
        record({ calendar_id: 'new', crm_instance_id: 'ins_new' }),
        record({
          calendar_id: 'expiring',
          crm_instance_id: 'ins_exp',
          ...watched,
          watch_expiration: new Date(NOW + DAY / 2).toISOString(),
        }),
        record({
          calendar_id: 'fresh',
          crm_instance_id: 'ins_fresh',
          ...watched,
          watch_expiration: new Date(NOW + 5 * DAY).toISOString(),
        }),
        record({ calendar_id: 'disabled', crm_instance_id: 'ins_off', sync_enabled: false, ...watched }),
        record({ calendar_id: 'never', crm_instance_id: 'ins_never', sync_enabled: null }),
      ],
      NOW,
    )

    expect(summary).toEqual({
      created: ['new'],
      renewed: ['expiring'],
      stopped: ['disabled'],
      unchanged: ['fresh'],
      unsupported: [],
      failed: [],
    })
  })

  it('records calendars Google does not offer push for, and other per-calendar failures', async () => {
    startCalendarWatch
      .mockRejectedValueOnce(
        Object.assign(new Error('Push notifications are not supported by this resource.'), {
          status: 400,
          response: { status: 400, data: { error: { errors: [{ reason: 'pushNotSupportedForRequestedResource' }] } } },
        }),
      )
      .mockRejectedValueOnce(new Error('backend error'))

    const summary = await reconcileCalendarWatches(
      auth,
      [record({ calendar_id: 'holidays' }), record({ calendar_id: 'broken' })],
      NOW,
    )

    expect(summary.unsupported).toEqual(['holidays'])
    expect(summary.failed).toEqual([{ calendar_id: 'broken', error: 'backend error' }])
  })

  it('aborts on rate limits so the platform backs off', async () => {
    startCalendarWatch.mockRejectedValue(
      Object.assign(new Error('Rate Limit Exceeded'), { status: 429 }),
    )

    await expect(reconcileCalendarWatches(auth, [record()], NOW)).rejects.toThrow(
      'Rate Limit Exceeded',
    )
  })
})

describe('watchTokensMatch', () => {
  it('compares tokens exactly', () => {
    expect(watchTokensMatch('abc', 'abc')).toBe(true)
    expect(watchTokensMatch('abc', 'abd')).toBe(false)
    expect(watchTokensMatch('abc', 'abcd')).toBe(false)
    expect(watchTokensMatch(null, 'abc')).toBe(false)
    expect(watchTokensMatch('abc', undefined)).toBe(false)
  })
})
