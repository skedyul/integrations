import { describe, expect, it, jest, beforeAll, beforeEach } from '@jest/globals'

type StepView = { handle: string; status: string } | null

const get = jest.fn<(handle: string) => Promise<StepView>>()

jest.unstable_mockModule('skedyul', () => ({
  setup: { get },
}))

let isCalendarSyncEnabled: () => Promise<boolean>
let CALENDAR_EVENTS_SETUP_STEP: string

beforeAll(async () => {
  ;({ isCalendarSyncEnabled, CALENDAR_EVENTS_SETUP_STEP } = await import('../setup_gate'))
})

describe('isCalendarSyncEnabled', () => {
  beforeEach(() => {
    get.mockReset()
  })

  it('is true only when the calendar events step is READY', async () => {
    get.mockResolvedValue({ handle: CALENDAR_EVENTS_SETUP_STEP, status: 'READY' })

    await expect(isCalendarSyncEnabled()).resolves.toBe(true)
    expect(get).toHaveBeenCalledWith(CALENDAR_EVENTS_SETUP_STEP)
  })

  it.each(['PENDING', 'INVALIDATED', 'BLOCKED', 'SKIPPED'])(
    'is false when the step is %s',
    async (status) => {
      get.mockResolvedValue({ handle: CALENDAR_EVENTS_SETUP_STEP, status })

      await expect(isCalendarSyncEnabled()).resolves.toBe(false)
    },
  )

  it('is false when the step does not exist', async () => {
    get.mockResolvedValue(null)

    await expect(isCalendarSyncEnabled()).resolves.toBe(false)
  })
})
