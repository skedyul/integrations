import { describe, expect, it, jest, beforeEach } from '@jest/globals'

const setRequirement = jest.fn<(input: unknown) => Promise<unknown>>()
const setChannelStatus = jest.fn<(input: unknown) => Promise<unknown>>()
const channelGet = jest.fn<(id: string) => Promise<unknown>>()
const channelList = jest.fn<(args: unknown) => Promise<unknown>>()
const instanceList = jest.fn<(model: string, args: unknown) => Promise<unknown>>()

jest.unstable_mockModule('skedyul', () => ({
  channelSetup: { setRequirement, setChannelStatus },
  communicationChannel: { get: channelGet, list: channelList },
  instance: { list: instanceList },
}))

const {
  complianceRequirementState,
  complianceSteps,
  reportCompliance,
  reportPhoneNumber,
  resolvePhoneNumberId,
} = await import('./channel_setup')

beforeEach(() => {
  jest.clearAllMocks()
})

describe('complianceRequirementState', () => {
  it('maps compliance statuses to requirement states', () => {
    expect(complianceRequirementState(undefined)).toBe('not_started')
    expect(complianceRequirementState('pending')).toBe('not_started')
    expect(complianceRequirementState('submitted')).toBe('in_review')
    expect(complianceRequirementState('pending_review')).toBe('in_review')
    expect(complianceRequirementState('approved')).toBe('approved')
    expect(complianceRequirementState('rejected')).toBe('rejected')
  })

  it('reads raw Twilio values and select-shaped values', () => {
    expect(complianceRequirementState('twilio-approved')).toBe('approved')
    expect(complianceRequirementState('in-review')).toBe('in_review')
    expect(complianceRequirementState({ value: 'approved', label: 'Approved' })).toBe('approved')
  })

  it('treats a pending record with a reason as rejected (failed evaluation)', () => {
    expect(complianceRequirementState('pending', 'Address not verified')).toBe('rejected')
  })
})

describe('complianceSteps', () => {
  const full = {
    business_name: 'ACME',
    business_id: '123',
    business_email: 'a@acme.test',
    country: 'AU',
    address: '1 Main St',
    file: 'fl_1',
    address_proof: 'fl_2',
    address_proof_type: 'utility_bill',
  }

  it('marks saved steps done and the rest not started', () => {
    const steps = complianceSteps({ business_name: 'ACME', business_id: '123', business_email: 'a@acme.test', country: 'AU' })
    expect(steps.map((s) => [s.item, s.state])).toEqual([
      ['business', 'approved'],
      ['address', 'not_started'],
      ['documents', 'not_started'],
      ['review', 'not_started'],
      ['verification', 'not_started'],
    ])
  })

  it('follows the carrier review and marks verification once approved', () => {
    expect(complianceSteps({ ...full, status: 'pending_review' }).map((s) => s.state)).toEqual([
      'approved', 'approved', 'approved', 'in_review', 'not_started',
    ])
    expect(complianceSteps({ ...full, status: 'approved' }).map((s) => s.state)).toEqual([
      'approved', 'approved', 'approved', 'approved', 'approved',
    ])
  })

  it('carries the rejection reason on the review step', () => {
    const review = complianceSteps({ ...full, status: 'rejected', rejection_reason: 'Blurry' })[3]
    expect(review).toEqual({ item: 'review', state: 'rejected', reason: 'Blurry' })
  })

  it('lists which documents are uploaded', () => {
    const docs = complianceSteps({ file: 'fl_1' })[2]
    expect(docs.documents).toEqual([
      { name: 'Registration document', state: 'uploaded' },
      { name: 'Proof of address', state: 'missing' },
    ])
  })
})

describe('reportCompliance', () => {
  it('reports every step in the compliance section', async () => {
    await reportCompliance({ status: 'rejected', rejection_reason: 'Blurry', business_name: 'ACME' }, 'ins_1')
    expect(setRequirement).toHaveBeenCalledTimes(5)
    expect(setRequirement).toHaveBeenCalledWith(
      expect.objectContaining({ appInstallationId: 'ins_1', section: 'compliance', item: 'review', state: 'rejected', reason: 'Blurry' }),
    )
    expect(setRequirement).toHaveBeenCalledWith(
      expect.objectContaining({ item: 'business', data: { business_name: 'ACME' } }),
    )
  })

  it('never throws when the platform call fails', async () => {
    setRequirement.mockRejectedValueOnce(new Error('unknown method'))
    await expect(reportCompliance({ status: 'approved' })).resolves.toBeUndefined()
  })
})

describe('resolvePhoneNumberId', () => {
  it('prefers phone_id', async () => {
    await expect(resolvePhoneNumberId({ phone_id: 'pn_1' }, {})).resolves.toBe('pn_1')
    expect(channelGet).not.toHaveBeenCalled()
  })

  it('maps a channel to its phone_number record', async () => {
    channelGet.mockResolvedValueOnce({ id: 'ch_1', identifierValue: '+61400000000' })
    instanceList.mockResolvedValueOnce({ data: [{ id: 'pn_2' }] })
    await expect(
      resolvePhoneNumberId({}, { request: { params: { communicationChannelId: 'ch_1' } } }),
    ).resolves.toBe('pn_2')
    expect(instanceList).toHaveBeenCalledWith('phone_number', {
      filter: { phone: { eq: '+61400000000' } },
      limit: 1,
    })
  })
})

describe('reportPhoneNumber', () => {
  it('reports call settings as channel attributes', async () => {
    await reportPhoneNumber(
      { phone: '+61400000000', forwarding_phone_number: '+61411111111', inbound_voice_enabled: true },
      { communicationChannelId: 'ch_1' },
    )
    expect(setChannelStatus).toHaveBeenCalledWith({
      communicationChannelId: 'ch_1',
      status: 'active',
      attributes: {
        phone: '+61400000000',
        forwarding_phone_number: '+61411111111',
        inbound_voice_enabled: true,
        outbound_voice_enabled: false,
      },
    })
  })

  it('finds the channel by number when not given', async () => {
    channelList.mockResolvedValueOnce([{ id: 'ch_9' }])
    await reportPhoneNumber({ phone: '+61400000000' })
    expect(channelList).toHaveBeenCalledWith({ filter: { identifierValue: '+61400000000' }, limit: 1 })
    expect(setChannelStatus).toHaveBeenCalledWith(expect.objectContaining({ communicationChannelId: 'ch_9' }))
  })
})
