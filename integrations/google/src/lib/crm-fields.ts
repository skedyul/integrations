/**
 * Read app entity fields from CRM instance rows.
 *
 * `instance.*` translates entity field handles to workplace handles on writes
 * and filters, but rows come back keyed by the workplace handles the install
 * map chose. Read the entity handle first, then the suggested default target
 * (`crmMapDefaults`), which is what most installs keep.
 */

import {
  calendarCrmMapDefaults,
  calendarEventCrmMapDefaults,
} from '../provision/entities/crmMapDefaults'

export type GoogleCrmEntity = 'calendar' | 'calendar_event'

const DEFAULT_FIELD_TARGETS: Record<GoogleCrmEntity, Record<string, string>> = {
  calendar: calendarCrmMapDefaults.fieldHandles,
  calendar_event: calendarEventCrmMapDefaults.fieldHandles,
}

const DEFAULT_RELATION_TARGETS: Record<GoogleCrmEntity, Record<string, string>> = {
  calendar: {},
  calendar_event: calendarEventCrmMapDefaults.relationshipHandles ?? {},
}

export type CrmRow = Record<string, unknown>

function unwrap(value: unknown): unknown {
  if (Array.isArray(value) && value.length === 1) {
    return unwrap(value[0])
  }
  return value
}

export function readEntityValue(
  row: CrmRow | null | undefined,
  entity: GoogleCrmEntity,
  field: string,
): unknown {
  if (!row) return undefined
  const direct = row[field]
  if (direct !== undefined && direct !== null) {
    return unwrap(direct)
  }
  const target = DEFAULT_FIELD_TARGETS[entity][field] ?? DEFAULT_RELATION_TARGETS[entity][field]
  if (target && target !== field) {
    const mapped = row[target]
    if (mapped !== undefined && mapped !== null) {
      return unwrap(mapped)
    }
  }
  return undefined
}

export function readEntityString(
  row: CrmRow | null | undefined,
  entity: GoogleCrmEntity,
  field: string,
): string | null {
  const value = readEntityValue(row, entity, field)
  if (typeof value === 'string') {
    return value.trim().length > 0 ? value : null
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString()
  }
  return null
}

export function readEntityBoolean(
  row: CrmRow | null | undefined,
  entity: GoogleCrmEntity,
  field: string,
): boolean | null {
  const value = readEntityValue(row, entity, field)
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  return null
}

/** Relation value as an instance id (rows may hydrate relations as objects). */
export function readEntityRelationId(
  row: CrmRow | null | undefined,
  entity: GoogleCrmEntity,
  relation: string,
): string | null {
  const value = readEntityValue(row, entity, relation)
  if (typeof value === 'string' && value.length > 0) return value
  if (value && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'string') {
    return (value as { id: string }).id
  }
  return null
}

export function readRowId(row: CrmRow | null | undefined): string | null {
  return row && typeof row.id === 'string' && row.id.length > 0 ? row.id : null
}
