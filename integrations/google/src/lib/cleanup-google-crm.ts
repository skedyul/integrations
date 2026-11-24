import { instance } from 'skedyul'
import { isSkedyulOriginatedGoogleEventId } from '../services/calendar/event-ids'
import { listCrmCalendarRecords } from './crm-calendars'
import { readEntityString, readRowId, type CrmRow } from './crm-fields'

type CleanupLog = {
  info: (message: string, ...args: unknown[]) => void
  warn: (message: string, ...args: unknown[]) => void
}

/**
 * Uninstall rule
 *
 * Remove only rows that exist because of the Google import; keep every
 * event that was created in Skedyul and strip its Google link.
 *
 * - attendee rows (event_attendee_key) are RSVP copies of Google guest lists:
 *   deleted.
 * - calendar_event rows whose google_event_id was minted by Skedyul (`sk` +
 *   sha256 of the CRM id, or an occurrence of such a series) were created in
 *   Skedyul: kept, with google_event_id / html_link / etag / updated_at
 *   cleared. Exceptions that pointed at a kept series by its Google id are
 *   re-pointed at the master's CRM id so the series still expands.
 * - Other calendar_event rows with a google_event_id came from Google:
 *   deleted, so a later import does not create a second copy. (Rows pushed
 *   to Google before Skedyul-minted ids existed cannot be told apart from
 *   imported ones and are deleted as before.)
 * - calendar rows still referenced by a remaining event are kept with their
 *   sync token and watch channel cleared; unreferenced ones are deleted.
 * - Rows with no Google id are never touched.
 */

const PAGE_LIMIT = 200
const UPDATE_CHUNK = 100

const STRIPPED_EVENT_FIELDS = {
  google_event_id: null,
  html_link: null,
  etag: null,
  updated_at: null,
} as const

const CLEARED_CALENDAR_SYNC = {
  sync_token: null,
  last_synced_at: null,
  watch_channel_id: null,
  watch_resource_id: null,
  watch_expiration: null,
  watch_token: null,
} as const

export type CleanupGoogleCrmResult = {
  deletedByEntity: Record<string, number>
  strippedEvents: number
  keptCalendars: number
}

async function listAll(model: string, filter: Record<string, unknown>): Promise<CrmRow[]> {
  const rows: CrmRow[] = []
  for (let page = 1; ; page += 1) {
    const result = await instance.list(model, {
      filter: filter as never,
      page,
      limit: PAGE_LIMIT,
    })
    rows.push(...(result.data as CrmRow[]))
    if (!result.pagination?.hasMore || result.data.length === 0) {
      return rows
    }
  }
}

async function deleteIds(model: string, ids: string[]): Promise<number> {
  if (ids.length === 0) return 0
  const result = await instance.deleteMany(model, { ids })
  return result.deleted.length
}

async function updateRows(
  model: string,
  updates: Map<string, Record<string, unknown>>,
  log: CleanupLog,
): Promise<number> {
  const items = [...updates.entries()].map(([id, data]) => ({ id, data }))
  let updated = 0
  for (let index = 0; index < items.length; index += UPDATE_CHUNK) {
    const result = await instance.updateMany(model, items.slice(index, index + UPDATE_CHUNK))
    updated += result.updated.length
    if (result.errors.length > 0) {
      log.warn(`[Google Uninstall] ${model} update had ${result.errors.length} errors`, result.errors[0])
    }
  }
  return updated
}

async function cleanupAttendees(log: CleanupLog): Promise<number> {
  const result = await instance.deleteMany('attendee', {
    filter: { event_attendee_key: { isNotEmpty: true } },
  })
  if (result.errors.length > 0) {
    log.warn(`[Google Uninstall] attendee delete had ${result.errors.length} errors`, result.errors[0])
  }
  return result.deleted.length
}

async function cleanupEvents(
  log: CleanupLog,
): Promise<{ deleted: number; stripped: number }> {
  const linked = await listAll('calendar_event', { google_event_id: { isNotEmpty: true } })

  const imported: string[] = []
  const updates = new Map<string, Record<string, unknown>>()
  /** Google id of a kept series master → its CRM id. */
  const keptMasters = new Map<string, string>()

  for (const row of linked) {
    const id = readRowId(row)
    const googleEventId = readEntityString(row, 'calendar_event', 'google_event_id')
    if (!id || !googleEventId) continue
    if (isSkedyulOriginatedGoogleEventId(googleEventId)) {
      updates.set(id, { ...STRIPPED_EVENT_FIELDS })
      if (!googleEventId.includes('_')) {
        keptMasters.set(googleEventId, id)
      }
    } else {
      imported.push(id)
    }
  }

  // Exceptions (pushed or not) that reference a kept master by Google id.
  const masterIds = [...keptMasters.keys()]
  for (let index = 0; index < masterIds.length; index += UPDATE_CHUNK) {
    const chunk = masterIds.slice(index, index + UPDATE_CHUNK)
    const exceptions = await listAll('calendar_event', { recurring_event_id: { in: chunk } })
    for (const row of exceptions) {
      const id = readRowId(row)
      const seriesId = readEntityString(row, 'calendar_event', 'recurring_event_id')
      const masterCrmId = seriesId ? keptMasters.get(seriesId) : undefined
      if (!id || !masterCrmId) continue
      updates.set(id, { ...(updates.get(id) ?? {}), recurring_event_id: masterCrmId })
    }
  }

  const stripped = await updateRows('calendar_event', updates, log)
  const deleted = await deleteIds('calendar_event', imported)
  return { deleted, stripped }
}

async function calendarStillReferenced(crmId: string, googleCalendarId: string): Promise<boolean> {
  const byRelation = await instance.list('calendar_event', {
    filter: { calendar: { eq: crmId } },
    limit: 1,
  })
  if (byRelation.data.length > 0) return true
  const byGoogleId = await instance.list('calendar_event', {
    filter: { calendar_id: { eq: googleCalendarId } },
    limit: 1,
  })
  return byGoogleId.data.length > 0
}

async function cleanupCalendars(
  log: CleanupLog,
): Promise<{ deleted: number; kept: number }> {
  const calendars = (await listCrmCalendarRecords()).filter(
    (record) => record.calendar_id && record.crm_instance_id,
  )
  const remove: string[] = []
  const keep = new Map<string, Record<string, unknown>>()

  for (const calendar of calendars) {
    const crmId = calendar.crm_instance_id as string
    let referenced = true
    try {
      referenced = await calendarStillReferenced(crmId, calendar.calendar_id)
    } catch (error) {
      // Unsure: keep the calendar rather than orphan Skedyul events.
      log.warn(`[Google Uninstall] Could not check events for calendar ${crmId}:`, error)
    }
    if (referenced) {
      keep.set(crmId, { ...CLEARED_CALENDAR_SYNC })
    } else {
      remove.push(crmId)
    }
  }

  const kept = await updateRows('calendar', keep, log)
  const deleted = await deleteIds('calendar', remove)
  return { deleted, kept }
}

/** Apply the uninstall rule above. Each entity is best-effort. */
export async function cleanupGoogleCrmRows(log: CleanupLog): Promise<CleanupGoogleCrmResult> {
  const deletedByEntity: Record<string, number> = { attendee: 0, calendar_event: 0, calendar: 0 }
  let strippedEvents = 0
  let keptCalendars = 0

  try {
    deletedByEntity.attendee = await cleanupAttendees(log)
  } catch (error) {
    log.warn('[Google Uninstall] Could not delete attendee rows:', error)
  }

  try {
    const events = await cleanupEvents(log)
    deletedByEntity.calendar_event = events.deleted
    strippedEvents = events.stripped
  } catch (error) {
    log.warn('[Google Uninstall] Could not clean up calendar_event rows:', error)
  }

  try {
    const calendars = await cleanupCalendars(log)
    deletedByEntity.calendar = calendars.deleted
    keptCalendars = calendars.kept
  } catch (error) {
    log.warn('[Google Uninstall] Could not clean up calendar rows:', error)
  }

  log.info(
    `[Google Uninstall] Deleted ${deletedByEntity.attendee} attendees, ${deletedByEntity.calendar_event} imported events, ${deletedByEntity.calendar} calendars; kept ${strippedEvents} Skedyul events and ${keptCalendars} calendars without Google links`,
  )
  return { deletedByEntity, strippedEvents, keptCalendars }
}
