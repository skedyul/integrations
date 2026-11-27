import { instance } from 'skedyul'
import { reportCompliance } from './channel_setup'

export type ComplianceRecordData = Record<string, unknown> & { id: string }

/** The installation's compliance record, if any (there is one per installation). */
export async function getComplianceRecord(): Promise<ComplianceRecordData | null> {
  const { data } = await instance.list('compliance_record', { page: 1, limit: 1 })
  return (data[0] as ComplianceRecordData | undefined) ?? null
}

function statusOf(record: ComplianceRecordData | null): string | undefined {
  const status = record?.status
  if (typeof status === 'string') return status
  if (status && typeof status === 'object' && typeof (status as { value?: unknown }).value === 'string') {
    return (status as { value: string }).value
  }
  return undefined
}

/** True while a submission is with the carrier or approved: details are fixed then. */
export function isComplianceLocked(record: ComplianceRecordData | null): boolean {
  const status = statusOf(record)
  return status === 'pending_review' || status === 'submitted' || status === 'approved'
}

/**
 * Saves some compliance details (one step's worth) onto the record, creating
 * it if needed, and reports the steps. Refused while the submission is in
 * review or approved, since a change would not reach the carrier.
 */
export async function saveComplianceStep(
  fields: Record<string, unknown>,
): Promise<{ ok: true; record: ComplianceRecordData } | { ok: false; message: string }> {
  const existing = await getComplianceRecord()
  if (isComplianceLocked(existing)) {
    return {
      ok: false,
      message:
        statusOf(existing) === 'approved'
          ? 'Your compliance is approved, so these details can no longer be changed.'
          : 'Your details are with the carrier for review. You can change them if the review asks for changes.',
    }
  }
  const values = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined))
  const record = existing
    ? ((await instance.update('compliance_record', existing.id, values)) as ComplianceRecordData)
    : ((await instance.create('compliance_record', { ...values, status: 'pending' })) as ComplianceRecordData)
  const merged = { ...(existing ?? {}), ...(record ?? {}), ...values } as ComplianceRecordData
  await reportCompliance(merged as Parameters<typeof reportCompliance>[0])
  return { ok: true, record: merged }
}
