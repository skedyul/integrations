export const SKEDYUL_ORIGIN_PROPERTY = 'skedyulOrigin'
export const SKEDYUL_INSTANCE_ID_PROPERTY = 'skedyulInstanceId'

export type CalendarEventSyncOrigin = 'skedyul' | 'google'

export type CalendarEventSyncOptions = {
  emit_app_event?: boolean
  sync_origin?: CalendarEventSyncOrigin
  skedyul_instance_id?: string
}

export function shouldEmitGoogleAppEvent(
  input: CalendarEventSyncOptions,
): boolean {
  if (input.emit_app_event === false) {
    return false
  }
  if (input.sync_origin === 'skedyul') {
    return false
  }
  return true
}

export function buildGoogleEventExtendedProperties(
  input: CalendarEventSyncOptions,
): { private: Record<string, string> } | undefined {
  const privateProps: Record<string, string> = {}
  if (input.sync_origin) {
    privateProps[SKEDYUL_ORIGIN_PROPERTY] = input.sync_origin
  }
  if (input.skedyul_instance_id) {
    privateProps[SKEDYUL_INSTANCE_ID_PROPERTY] = input.skedyul_instance_id
  }
  if (Object.keys(privateProps).length === 0) {
    return undefined
  }
  return { private: privateProps }
}

export function readSkedyulExtendedProperties(privateProps: {
  [key: string]: string | undefined
} | null | undefined): {
  origin: string | null
  skedyul_instance_id: string | null
} {
  return {
    origin: privateProps?.[SKEDYUL_ORIGIN_PROPERTY] ?? null,
    skedyul_instance_id: privateProps?.[SKEDYUL_INSTANCE_ID_PROPERTY] ?? null,
  }
}
