import { describe, expect, it } from '@jest/globals'
import type { GoogleEventEntity } from '../../events/types'
import type { ExistingEventRow } from '../crm-events'
import { decideEventUpsert, eventLookupIds, isNotNewer } from '../event-upsert-plan'
import { skedyulGoogleEventId } from '../../services/calendar/event-ids'

function event(overrides: Partial<GoogleEventEntity>): GoogleEventEntity {
  return {
    google_event_id: 'evt',
    status: 'confirmed',
    summary: 'A',
    description: null,
    start: '2026-09-01T09:00:00Z',
    end: '2026-09-01T10:00:00Z',
    timezone: null,
    all_day: false,
    recurrence: null,
    recurring_event_id: null,
    original_start: null,
    attendees: [],
    location: null,
    html_link: null,
    updated_at: '2026-09-01T00:00:00Z',
    etag: '"e"',
    ...overrides,
  }
}

function rows(...entries: ExistingEventRow[]): Map<string, ExistingEventRow> {
  return new Map(entries.map((entry) => [entry.google_event_id, entry]))
}

describe('isNotNewer', () => {
  it('compares instants, and is false when either side is unknown', () => {
    expect(isNotNewer('2026-09-01T00:00:00Z', '2026-09-01T00:00:00.000Z')).toBe(true)
    expect(isNotNewer('2026-09-01T00:00:01Z', '2026-09-01T00:00:00Z')).toBe(false)
    expect(isNotNewer(null, '2026-09-01T00:00:00Z')).toBe(false)
    expect(isNotNewer('2026-09-01T00:00:00Z', null)).toBe(false)
  })
})

describe('decideEventUpsert', () => {
  it('upserts new and newer events', () => {
    expect(decideEventUpsert(event({}), new Map())).toEqual({ action: 'upsert' })
    expect(
      decideEventUpsert(
        event({}),
        rows({ id: 'ins', google_event_id: 'evt', updated_at: '2026-08-01T00:00:00Z' }),
      ),
    ).toEqual({ action: 'upsert' })
  })

  it('skips a Google copy that is not newer than the CRM row', () => {
    expect(
      decideEventUpsert(
        event({}),
        rows({ id: 'ins', google_event_id: 'evt', updated_at: '2026-09-01T00:00:00Z' }),
      ),
    ).toEqual({ action: 'skip', reason: 'not_newer' })
  })

  it('marks a known cancelled event cancelled without touching its other fields', () => {
    expect(
      decideEventUpsert(
        event({ status: 'cancelled', updated_at: '2026-09-02T00:00:00Z' }),
        rows({ id: 'ins', google_event_id: 'evt', updated_at: null }),
      ),
    ).toEqual({
      action: 'cancel',
      fields: {
        google_event_id: 'evt',
        status: 'cancelled',
        updated_at: '2026-09-02T00:00:00Z',
        etag: '"e"',
      },
    })
  })

  it('never creates a row for a cancelled event the CRM does not have', () => {
    expect(decideEventUpsert(event({ status: 'cancelled' }), new Map())).toEqual({
      action: 'skip',
      reason: 'unknown_cancelled',
    })
  })

  it('stores a cancelled all-day occurrence of a known series as a cancelled exception', () => {
    const decision = decideEventUpsert(
      event({
        google_event_id: 'master_20260901',
        status: 'cancelled',
        recurring_event_id: 'master',
        original_start: '2026-09-01',
      }),
      rows({ id: 'ins_master', google_event_id: 'master', updated_at: null }),
    )
    expect(decision).toMatchObject({
      action: 'cancel',
      fields: {
        google_event_id: 'master_20260901',
        recurring_event_id: 'master',
        original_start: '2026-09-01',
        all_day: true,
        status: 'cancelled',
      },
    })
  })

  it('skips a cancelled occurrence of a series the CRM no longer has', () => {
    expect(
      decideEventUpsert(
        event({
          google_event_id: 'gone_20260901T090000Z',
          status: 'cancelled',
          recurring_event_id: 'gone',
          original_start: '2026-09-01T09:00:00Z',
        }),
        new Map(),
      ),
    ).toEqual({ action: 'skip', reason: 'unknown_cancelled' })
  })

  it('waits for the write-back of an event created in Skedyul', () => {
    const id = skedyulGoogleEventId('ins_1')
    expect(decideEventUpsert(event({ google_event_id: id }), new Map())).toEqual({
      action: 'skip',
      reason: 'pending_writeback',
    })
    expect(
      decideEventUpsert(
        event({ google_event_id: id }),
        rows({ id: 'ins_1', google_event_id: id, updated_at: '2026-08-01T00:00:00Z' }),
      ),
    ).toEqual({ action: 'upsert' })
  })
})

describe('eventLookupIds', () => {
  it('includes the series of cancelled occurrences', () => {
    expect(
      eventLookupIds([
        event({ google_event_id: 'a' }),
        event({ google_event_id: 'm_1', status: 'cancelled', recurring_event_id: 'm' }),
      ]),
    ).toEqual(['a', 'm_1', 'm'])
  })
})
