import { instance } from 'skedyul'
import { readEntityString, readRowId, type CrmRow } from './crm-fields'

export type ExistingEventRow = {
  id: string
  google_event_id: string
  /** Google `updated` stored on the row by the last pull or push write-back. */
  updated_at: string | null
}

const LOOKUP_CHUNK = 100

/** CRM event rows keyed by google_event_id, read in chunks with an `in` filter. */
export async function findCrmEventsByGoogleIds(
  googleEventIds: string[],
): Promise<Map<string, ExistingEventRow>> {
  const ids = [...new Set(googleEventIds.filter((id) => id.length > 0))]
  const byGoogleId = new Map<string, ExistingEventRow>()

  for (let index = 0; index < ids.length; index += LOOKUP_CHUNK) {
    const chunk = ids.slice(index, index + LOOKUP_CHUNK)
    const result = await instance.list('calendar_event', {
      filter: { google_event_id: { in: chunk } },
      limit: chunk.length,
    })
    for (const raw of result.data) {
      const row = raw as CrmRow
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

  return byGoogleId
}
