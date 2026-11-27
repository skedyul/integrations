/**
 * Bridges the Phone app's records to Settings → Communication.
 *
 * The Communication page runs our tools with the channel it was used on
 * (`communicationChannelId`) instead of a `phone_number` instance id, and
 * shows the state we report through `channelSetup.*`. Reporting is best
 * effort: a platform without the channelSetup API must not break a tool.
 */
import { channelSetup, communicationChannel, instance } from 'skedyul'

import { COMPLIANCE_ITEM, COMPLIANCE_SECTION } from './channel_setup_handles'

export { COMPLIANCE_ITEM, COMPLIANCE_SECTION }

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
export function complianceRequirementState(
  status: string | null | undefined,
  rejectionReason?: string | null,
): 'not_started' | 'in_review' | 'approved' | 'rejected' {
  // A submission that failed evaluation goes back to `pending` with a reason.
  if (status === 'pending' && rejectionReason) return 'rejected'
  switch (status) {
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
  status?: string | null
  rejection_reason?: string | null
  business_name?: string | null
  business_id?: string | null
  business_email?: string | null
  country?: string | null
  address?: string | null
  address_proof_type?: string | null
}

/** Report the compliance record as the `compliance` requirement item. */
export async function reportCompliance(
  record: ComplianceRecord,
  appInstallationId?: string,
): Promise<void> {
  const state = complianceRequirementState(record.status, record.rejection_reason)
  // Saved values prefill the form when a rejected submission is fixed.
  const data = Object.fromEntries(
    (
      [
        'business_name',
        'business_id',
        'business_email',
        'country',
        'address',
        'address_proof_type',
      ] as const
    ).flatMap((key) => (record[key] ? [[key, String(record[key])]] : [])),
  )
  try {
    await channelSetup.setRequirement({
      ...(appInstallationId ? { appInstallationId } : {}),
      section: COMPLIANCE_SECTION,
      item: COMPLIANCE_ITEM,
      state,
      reason: state === 'rejected' ? (record.rejection_reason ?? null) : null,
      data,
    })
  } catch (error) {
    console.warn('[channelSetup] Could not report compliance:', error)
  }
}

type PhoneNumberRecord = {
  phone?: string | null
  forwarding_phone_number?: string | null
  inbound_voice_enabled?: boolean | null
  outbound_voice_enabled?: boolean | null
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
        outbound_voice_enabled: Boolean(record.outbound_voice_enabled),
      },
    })
  } catch (error) {
    console.warn('[channelSetup] Could not report phone number:', error)
  }
}
