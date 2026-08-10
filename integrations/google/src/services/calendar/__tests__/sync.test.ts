import { describe, expect, it, jest, beforeAll, beforeEach } from '@jest/globals'
import type { OAuth2Client } from 'google-auth-library'
import type { calendar_v3 } from 'googleapis'
import type { GoogleCalendarRecord } from '../../../events/types'

type ListResult = {
  events: calendar_v3.Schema$Event[]
  nextSyncToken?: string | null
  nextPageToken?: string | null
}

const isCalendarSyncEnabled = jest.fn<() => Promise<boolean>>()
const emitGoogleEvent = jest.fn<(...args: unknown[]) => Promise<{ emitted: boolean }>>()
const listGoogleCalendarEvents = jest.fn<(...args: unknown[]) => Promise<ListResult>>()
const update = jest.fn<(...args: unknown[]) => Promise<unknown>>()

jest.unstable_mockModule('../../../lib/setup_gate', () => ({
  isCalendarSyncEnabled,
}))

jest.unstable_mockModule('../../../lib/emit-google-event', () => ({
  emitGoogleEvent,
}))

jest.unstable_mockModule('../client', () => ({
  listGoogleCalendarEvents,
}))

jest.unstable_mockModule('skedyul', () => ({
  instance: { update },
}))

let syncGoogleCalendar: typeof import('../sync').syncGoogleCalendar

beforeAll(async () => {
  ;({ syncGoogleCalendar } = await import('../sync'))
})

const auth = {} as OAuth2Client

const calendarRecord: GoogleCalendarRecord = {
  id: 'rec_1',
  calendar_id: 'primary',
  summary: 'Work',
  sync_enabled: true,
  sync_direction: 'both',
  sync_token: 'existing-token',
}

describe('syncGoogleCalendar', () => {
  beforeEach(() => {
    isCalendarSyncEnabled.mockReset()
    emitGoogleEvent.mockReset()
    listGoogleCalendarEvents.mockReset()
    update.mockReset()
    emitGoogleEvent.mockResolvedValue({ emitted: true })
  })

  it('emits nothing when the calendar events setup step is incomplete', async () => {
    isCalendarSyncEnabled.mockResolvedValue(false)

    const result = await syncGoogleCalendar({
      auth,
      appInstallationId: 'install-1',
      calendarRecord,
      trigger: 'push',
    })

    expect(result).toEqual({
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      nextSyncToken: 'existing-token',
    })
    expect(listGoogleCalendarEvents).not.toHaveBeenCalled()
    expect(emitGoogleEvent).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('syncs and emits once the setup step is complete', async () => {
    isCalendarSyncEnabled.mockResolvedValue(true)
    listGoogleCalendarEvents.mockResolvedValue({
      events: [
        {
          id: 'evt_1',
          status: 'confirmed',
          created: '2026-07-20T10:00:00.000Z',
          updated: '2026-07-20T10:00:00.000Z',
        },
      ],
      nextSyncToken: 'new-token',
      nextPageToken: null,
    })

    const result = await syncGoogleCalendar({
      auth,
      appInstallationId: 'install-1',
      calendarRecord,
      trigger: 'push',
    })

    expect(result.eventsCreated).toBe(1)
    expect(result.nextSyncToken).toBe('new-token')
    // one calendar.event.created plus one calendar.sync.completed
    expect(emitGoogleEvent).toHaveBeenCalledTimes(2)
    expect(update).toHaveBeenCalledWith('google_calendar', 'rec_1', {
      sync_token: 'new-token',
      last_synced_at: expect.any(String),
    })
  })
})
