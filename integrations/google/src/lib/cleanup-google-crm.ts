import { instance } from 'skedyul'

type CleanupLog = {
  info: (message: string, ...args: unknown[]) => void
  warn: (message: string, ...args: unknown[]) => void
}

/**
 * Google-sourced CRM rows, deleted before attendees so event relations
 * do not keep dangling calendar/event targets after uninstall.
 */
export const GOOGLE_KEYED_CRM_ENTITIES = [
  { entity: 'attendee', matchField: 'event_attendee_key' },
  { entity: 'calendar_event', matchField: 'google_event_id' },
  { entity: 'calendar', matchField: 'google_calendar_id' },
] as const

export type DeleteGoogleKeyedCrmRowsResult = {
  deletedByEntity: Record<string, number>
}

/**
 * Soft-delete workplace CRM rows that carry a Google match key so a later
 * Import does not create a second set beside leftovers.
 */
export async function deleteGoogleKeyedCrmRows(
  log: CleanupLog,
): Promise<DeleteGoogleKeyedCrmRowsResult> {
  const deletedByEntity: Record<string, number> = {}

  for (const { entity, matchField } of GOOGLE_KEYED_CRM_ENTITIES) {
    try {
      const result = await instance.deleteMany(entity, {
        filter: { [matchField]: { isNotEmpty: true } },
      })
      const deleted = result.deleted.length
      deletedByEntity[entity] = deleted
      if (result.errors.length > 0) {
        log.warn(
          `[Google Uninstall] ${entity} delete had ${result.errors.length} errors`,
          result.errors[0],
        )
      }
      log.info(`[Google Uninstall] Deleted ${deleted} ${entity} rows keyed by ${matchField}`)
    } catch (error) {
      deletedByEntity[entity] = 0
      log.warn(`[Google Uninstall] Could not delete ${entity} rows:`, error)
    }
  }

  return { deletedByEntity }
}
