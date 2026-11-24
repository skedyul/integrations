import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { GoogleCalendarRecord } from '../../events/types'

type Row = Record<string, unknown>

const instanceUpdate = jest.fn<(model: string, id: string, data: Row) => Promise<Row>>()
const instanceList = jest.fn(async () => ({
  data: [] as Row[],
  pagination: { page: 1, total: 0, hasMore: false, limit: 1 },
}))
type Registration = {
  id: string
  name: string
  url: string
  context: Record<string, unknown> | null
  createdAt: string
  expiresAt: string | null
  autoRenew: boolean
}
const registration = (calendarId: string, autoRenew = true): Registration => ({
  id: `whreg_${calendarId}`,
  name: 'calendar_push',
  url: `https://hooks/whreg_${calendarId}`,
  context: { calendar_id: calendarId },
  createdAt: '',
  expiresAt: null,
  autoRenew,
})
const webhookList = jest.fn(async () => ({ webhooks: [] as Registration[] }))
const webhookCreate = jest.fn(async (_name: string, context?: Record<string, unknown>) => ({
  id: `whreg_${String(context?.calendar_id)}`,
  url: `https://hooks/whreg_${String(context?.calendar_id)}`,
  expiresAt: null,
}))
const webhookUpdate = jest.fn(async (id: string, params: { expiresAt?: string | null; autoRenew?: boolean }) => ({
  id,
  url: `https://hooks/${id}`,
  expiresAt: params.expiresAt ?? null,
  autoRenew: params.autoRenew ?? false,
}))
const webhookDeleteByName = jest.fn(async (_name: string, _options?: unknown) => ({ count: 1 }))
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
    webhook: {
      ...actual.webhook,
      list: webhookList,
      create: webhookCreate,
      update: webhookUpdate,
      deleteByName: webhookDeleteByName,
    },
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
  renewCalendarChannel,
  watchTokensMatch,
} = await import('../calendar_link')

const resetWebhookMocks = (registrations: Registration[] = []) => {
  webhookList.mockReset().mockResolvedValue({ webhooks: registrations })
  webhookCreate.mockClear()
  webhookUpdate.mockClear()
  webhookDeleteByName.mockClear()
}

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
    resetWebhookMocks()
    instanceUpdate.mockReset().mockResolvedValue({ id: 'ins_cal' })
    startCalendarWatch.mockReset().mockImplementation(async (_auth, options) => ({
      channelId: 'ch_new',
      resourceId: 'res_new',
      expiration: new Date(NOW + 7 * DAY).toISOString(),
      token: options.token ?? 'missing',
    }))
    stopCalendarWatch.mockClear()
  })

  it('opens a channel on its own registration and hands the expiry to the platform', async () => {
    const next = await ensureCalendarWatch(auth, record(), NOW)

    expect(webhookCreate).toHaveBeenCalledWith('calendar_push', { calendar_id: 'primary' })
    const token = startCalendarWatch.mock.calls[0]?.[1].token
    expect(token).toMatch(/^[0-9a-f]{64}$/)
    expect(token).not.toBe('primary')
    expect(startCalendarWatch.mock.calls[0]?.[1].webhookUrl).toBe('https://hooks/whreg_primary')
    expect(instanceUpdate).toHaveBeenCalledWith('calendar', 'ins_cal', {
      watch_channel_id: 'ch_new',
      watch_resource_id: 'res_new',
      watch_expiration: new Date(NOW + 7 * DAY).toISOString(),
      watch_token: token,
    })
    expect(webhookUpdate).toHaveBeenCalledWith('whreg_primary', {
      expiresAt: new Date(NOW + 7 * DAY).toISOString(),
      autoRenew: true,
    })
    expect(next.watch_channel_id).toBe('ch_new')
  })

  it('keeps a stored channel the platform is renewing', async () => {
    resetWebhookMocks([registration('primary')])
    const current = record({
      ...watched,
      watch_expiration: new Date(NOW + 3 * DAY).toISOString(),
    })

    await expect(ensureCalendarWatch(auth, current, NOW)).resolves.toBe(current)
    expect(startCalendarWatch).not.toHaveBeenCalled()
    expect(webhookCreate).not.toHaveBeenCalled()
  })

  it('reopens a channel whose registration is not renewed by the platform', async () => {
    resetWebhookMocks([registration('primary', false)])
    const current = record({
      ...watched,
      watch_expiration: new Date(NOW + 3 * DAY).toISOString(),
    })

    await ensureCalendarWatch(auth, current, NOW)

    expect(startCalendarWatch.mock.calls[0]?.[1].webhookUrl).toBe('https://hooks/whreg_primary')
    expect(webhookUpdate).toHaveBeenCalledWith('whreg_primary', expect.objectContaining({ autoRenew: true }))
    expect(stopCalendarWatch).toHaveBeenCalledWith(auth, { channelId: 'ch_old', resourceId: 'res_old' })
  })

  it('replaces an expiring channel: new channel first, then stops the old one', async () => {
    resetWebhookMocks([registration('primary')])
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
    expect(webhookUpdate).not.toHaveBeenCalled()
  })

  it('undoes the new channel when the platform lease cannot be stored', async () => {
    webhookUpdate.mockRejectedValueOnce(new Error('core api down'))

    await expect(ensureCalendarWatch(auth, record(), NOW)).rejects.toThrow('core api down')
    expect(stopCalendarWatch).toHaveBeenCalledWith(auth, { channelId: 'ch_new', resourceId: 'res_new' })
    expect(instanceUpdate).toHaveBeenLastCalledWith('calendar', 'ins_cal', {
      watch_channel_id: null,
      watch_resource_id: null,
      watch_expiration: null,
      watch_token: null,
    })
  })
})

describe('renewCalendarChannel', () => {
  beforeEach(() => {
    resetWebhookMocks()
    instanceUpdate.mockReset().mockResolvedValue({ id: 'ins_cal' })
    startCalendarWatch.mockReset().mockImplementation(async (_auth, options) => ({
      channelId: 'ch_new',
      resourceId: 'res_new',
      expiration: new Date(NOW + 7 * DAY).toISOString(),
      token: options.token ?? '',
    }))
    stopCalendarWatch.mockClear()
  })

  it('opens the new channel on the same URL and stops the old one; the platform stores the lease', async () => {
    const next = await renewCalendarChannel(auth, record(watched), {
      url: 'https://hooks/whreg_primary',
    })

    expect(startCalendarWatch.mock.calls[0]?.[1].webhookUrl).toBe('https://hooks/whreg_primary')
    expect(stopCalendarWatch).toHaveBeenCalledWith(auth, { channelId: 'ch_old', resourceId: 'res_old' })
    expect(next.watch_expiration).toBe(new Date(NOW + 7 * DAY).toISOString())
    expect(webhookUpdate).not.toHaveBeenCalled()
    expect(webhookList).not.toHaveBeenCalled()
  })
})

describe('removeCalendarWatch', () => {
  beforeEach(() => {
    resetWebhookMocks()
    instanceUpdate.mockReset().mockResolvedValue({ id: 'ins_cal' })
    stopCalendarWatch.mockClear()
  })

  it('stops the channel, clears the stored watch fields and deletes its registration', async () => {
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
    expect(webhookDeleteByName).toHaveBeenCalledWith('calendar_push', {
      filter: { calendar_id: 'primary' },
    })
  })

  it('can keep the registration (the platform deletes it after renew returns delete)', async () => {
    await removeCalendarWatch(auth, record(watched), { keepRegistration: true })
    expect(webhookDeleteByName).not.toHaveBeenCalled()
  })
})

describe('reconcileCalendarWatches', () => {
  beforeEach(() => {
    resetWebhookMocks([registration('expiring'), registration('fresh'), registration('disabled')])
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
    // Registrations are listed once for the whole run.
    expect(webhookList).toHaveBeenCalledTimes(1)
    expect(webhookCreate).toHaveBeenCalledWith('calendar_push', { calendar_id: 'new' })
    expect(webhookDeleteByName).toHaveBeenCalledWith('calendar_push', {
      filter: { calendar_id: 'disabled' },
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
