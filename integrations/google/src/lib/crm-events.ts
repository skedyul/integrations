import { instance } from 'skedyul'
import { readEntityString, readRowId, type CrmRow } from './crm-fields'

export type ExistingEventRow = {
  id: string
  google_event_id: string
  /** Google `updated` stored on the row by the last pull or push write-back. */
  updated_at: string | null
}

const LOOKUP_CHUNK = 50
/** Guard against a filter the platform does not apply (would page every row). */
const MAX_PAGES_PER_CHUNK = 5

/** CRM event rows keyed by google_event_id, read in chunks with an `in` filter. */
export async function findCrmEventsByGoogleIds(
  googleEventIds: string[],
): Promise<Map<string, ExistingEventRow>> {
  const ids = [...new Set(googleEventIds.filter((id) => id.length > 0))]
  const byGoogleId = new Map<string, ExistingEventRow>()

  for (let index = 0; index < ids.length; index += LOOKUP_CHUNK) {
    const chunk = ids.slice(index, index + LOOKUP_CHUNK)
    for (let page = 1; page <= MAX_PAGES_PER_CHUNK; page += 1) {
      const result = await instance.list('calendar_event', {
        filter: { google_event_id: { in: chunk } },
        page,
        limit: LOOKUP_CHUNK,
      })
      collectRows(result.data as CrmRow[], byGoogleId)
      if (!result.pagination?.hasMore || result.data.length === 0) {
        break
      }
    }
  }

  return byGoogleId
}

function collectRows(rows: CrmRow[], byGoogleId: Map<string, ExistingEventRow>): void {
  for (const row of rows) {
    const id = readRowId(row)
    const googleEventId = readEntityString(row, 'calendar_event', 'google_event_id')
    if (!id || !googleEventId) continue
    byGoogleId.set(googleEventId, {
      id,
      google_event_id: googleEventId,
      updated_at: readEntityString(row, 'calendar_event', 'updated_at'),
    })
  }
}
