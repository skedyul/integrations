/**
 * Bridges the Phone app's records to Settings → Communication.
 *
 * The Communication page runs our tools with the channel it was used on
 * (`communicationChannelId`) instead of a `phone_number` instance id, and
 * shows the state we report through `channelSetup.*`. Reporting is best
 * effort: a platform without the channelSetup API must not break a tool.
 */
import { channelSetup, communicationChannel, instance } from 'skedyul'

import { COMPLIANCE_SECTION, COMPLIANCE_STEPS } from './channel_setup_handles'

export { COMPLIANCE_SECTION, COMPLIANCE_STEPS }

type RequestContext = { request?: { params?: Record<string, string | undefined> } }

/**
 * The `phone_number` instance a tool acts on: from `phone_id` (app pages) or
 * from the channel the Communication page passes.
 */
export async function resolvePhoneNumberId(
  input: { phone_id?: string; communicationChannelId?: string },
  context: RequestContext,
): Promise<string | undefined> {
  const direct = input.phone_id || context.request?.params?.phone_id
  if (direct) return direct

  const channelId =
    input.communicationChannelId || context.request?.params?.communicationChannelId
  if (!channelId) return undefined

  const channel = await communicationChannel.get(channelId)
  if (!channel?.identifierValue) return undefined

  const { data } = await instance.list('phone_number', {
    filter: { phone: { eq: channel.identifierValue } },
    limit: 1,
  })
  const record = data[0] as { id?: string } | undefined
  return record?.id
}

/** Twilio-derived compliance statuses → requirement states. */
/** A stored value as text: select fields can come back as `{ value }`. */
function text(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && typeof (value as { value?: unknown }).value === 'string') {
    return (value as { value: string }).value
  }
  return null
}

export function complianceRequirementState(
  rawStatus: unknown,
  rejectionReason?: string | null,
): 'not_started' | 'in_review' | 'approved' | 'rejected' {
  // Older records may hold Twilio's own value (`twilio-approved`, `in-review`).
  const status = text(rawStatus)?.replace(/^twilio-/, '').replace(/-/g, '_')
  // A submission that failed evaluation goes back to `pending` with a reason.
  if (status === 'pending' && rejectionReason) return 'rejected'
  switch (status) {
    case 'in_review':
      return 'in_review'
    case 'approved':
      return 'approved'
    case 'rejected':
      return 'rejected'
    case 'submitted':
    case 'pending_review':
      return 'in_review'
    default:
      return 'not_started'
  }
}

type ComplianceRecord = {
  status?: unknown
  rejection_reason?: string | null
  business_name?: unknown
  business_id?: unknown
  business_email?: unknown
  country?: unknown
  address?: unknown
  file?: unknown
  address_proof?: unknown
  address_proof_type?: unknown
}

type RequirementState = 'not_started' | 'in_review' | 'approved' | 'rejected'

type ComplianceStep = {
  item: string
  state: RequirementState
  reason?: string | null
  data?: Record<string, string>
  documents?: Array<{ name: string; state: 'uploaded' | 'missing' | 'rejected' }>
}

/** Only the keys that hold a value, as text (they prefill each step's form). */
function values(record: ComplianceRecord, keys: (keyof ComplianceRecord)[]): Record<string, string> {
  return Object.fromEntries(
    keys.flatMap((key) => {
      const value = text(record[key])
      return value ? [[key, value]] : []
    }),
  )
}

/**
 * The compliance record as its five steps: business details, address and
 * documents are done once saved; review follows the carrier's decision; the
 * verification check is done once approved.
 */
export function complianceSteps(record: ComplianceRecord): ComplianceStep[] {
  const review = complianceRequirementState(record.status, record.rejection_reason)
  const business = values(record, ['business_name', 'business_id', 'business_email', 'country'])
  const address = values(record, ['address'])
  const documents = values(record, ['address_proof_type'])
  const hasFile = Boolean(text(record.file))
  const hasProof = Boolean(text(record.address_proof))
  const filled = (data: Record<string, string>, keys: string[]): RequirementState =>
    keys.every((k) => data[k]) ? 'approved' : 'not_started'

  return [
    {
      item: COMPLIANCE_STEPS.business,
      state: filled(business, ['business_name', 'business_id', 'business_email', 'country']),
      data: business,
    },
    { item: COMPLIANCE_STEPS.address, state: filled(address, ['address']), data: address },
    {
      item: COMPLIANCE_STEPS.documents,
      state: hasFile && hasProof && documents.address_proof_type ? 'approved' : 'not_started',
      data: documents,
      documents: [
        { name: 'Registration document', state: hasFile ? 'uploaded' : 'missing' },
        { name: 'Proof of address', state: hasProof ? 'uploaded' : 'missing' },
      ],
    },
    {
      item: COMPLIANCE_STEPS.review,
      state: review,
      reason: review === 'rejected' ? (record.rejection_reason ?? null) : null,
    },
    {
      item: COMPLIANCE_STEPS.verification,
      state: review === 'approved' ? 'approved' : 'not_started',
    },
  ]
}

/** Report the compliance record as its steps in the `compliance` section. */
export async function reportCompliance(
  record: ComplianceRecord,
  appInstallationId?: string,
): Promise<void> {
  try {
    for (const step of complianceSteps(record)) {
      await channelSetup.setRequirement({
        ...(appInstallationId ? { appInstallationId } : {}),
        section: COMPLIANCE_SECTION,
        ...step,
        reason: step.reason ?? null,
      })
    }
  } catch (error) {
    console.warn('[channelSetup] Could not report compliance:', error)
  }
}

type PhoneNumberRecord = {
  phone?: string | null
  forwarding_phone_number?: string | null
  inbound_voice_enabled?: boolean | null
  outbound_voice_enabled?: boolean | null
  inbound_call_route?: string | null
}

/**
 * Report a number's call settings as attributes of its channel, which the
 * Communication page's call settings form and feature chips read.
 */
export async function reportPhoneNumber(
  record: PhoneNumberRecord,
  options: { communicationChannelId?: string; appInstallationId?: string } = {},
): Promise<void> {
  try {
    let channelId = options.communicationChannelId
    if (!channelId && record.phone) {
      const channels = await communicationChannel.list({
        filter: { identifierValue: record.phone },
        limit: 1,
      })
      channelId = channels[0]?.id
    }
    if (!channelId) return
    await channelSetup.setChannelStatus({
      ...(options.appInstallationId ? { appInstallationId: options.appInstallationId } : {}),
      communicationChannelId: channelId,
      status: 'active',
      attributes: {
        ...(record.phone ? { phone: record.phone } : {}),
        forwarding_phone_number: record.forwarding_phone_number ?? '',
        inbound_voice_enabled: Boolean(record.inbound_voice_enabled),
        inbound_call_route: record.inbound_call_route === 'app' ? 'app' : 'forward',
        outbound_voice_enabled: Boolean(record.outbound_voice_enabled),
      },
    })
  } catch (error) {
    console.warn('[channelSetup] Could not report phone number:', error)
  }
}
