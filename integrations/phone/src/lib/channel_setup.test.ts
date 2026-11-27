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

describe('reportCompliance', () => {
  it('reports state, reason and the submitted details', async () => {
    await reportCompliance(
      {
        status: 'rejected',
        rejection_reason: 'Blurry document',
        business_name: 'ACME',
        business_id: '123',
        address: '1 Main St',
      },
      'ins_1',
    )
    expect(setRequirement).toHaveBeenCalledWith({
      appInstallationId: 'ins_1',
      section: 'compliance',
      item: 'business',
      state: 'rejected',
      reason: 'Blurry document',
      data: { business_name: 'ACME', business_id: '123', address: '1 Main St' },
    })
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
