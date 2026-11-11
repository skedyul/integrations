import { describe, expect, it, jest } from '@jest/globals'
import {
  submitComplianceToTwilio,
  type ComplianceSubmissionInput,
  type ComplianceTwilioPort,
} from './compliance_submission'

const EXISTING_BUNDLE = 'BUf5ae2e0ae37c6e188530ac98b389a77c'
const NEW_BUNDLE = 'BUaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const END_USER = 'ITaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const ADDRESS = 'ADaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const DOCUMENT = 'RDaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const ADDRESS_DOCUMENT = 'RDbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'

const proof = Buffer.from('%PDF-1.4 commercial register')
const addressProofFile = Buffer.from('%PDF-1.4 utility bill')

function input(overrides: Partial<ComplianceSubmissionInput> = {}): ComplianceSubmissionInput {
  return {
    businessName: 'Ensignth Pty Ltd',
    businessEmail: 'compliance@ensignth.example',
    businessId: '12345678901',
    isoCountry: 'AU',
    address: {
      customerName: 'Ensignth Pty Ltd',
      street: '1 George St',
      city: 'Sydney',
      region: 'NSW',
      postalCode: '2000',
      isoCountry: 'AU',
    },
    proof: { file: proof, filename: 'asic-extract.pdf' },
    addressProof: {
      file: addressProofFile,
      filename: 'electricity-bill.pdf',
      type: 'utility_bill',
    },
    friendlyBundleName: 'Ensignth Pty Ltd Compliance Bundle',
    createStatusCallback: async () => 'https://example.test/compliance',
    ...overrides,
  }
}

function port(overrides: Partial<ComplianceTwilioPort> = {}): ComplianceTwilioPort & {
  calls: string[]
  documents: Array<{ type: string; attributes: Record<string, string | string[]> }>
} {
  const calls: string[] = []
  const documents: Array<{ type: string; attributes: Record<string, string | string[]> }> = []
  const base: ComplianceTwilioPort = {
    fetchBundleStatus: async () => {
      calls.push('fetch')
      return { status: 'twilio-rejected' }
    },
    createAddress: async () => {
      calls.push('address')
      return { sid: ADDRESS }
    },
    createEndUser: async () => {
      calls.push('end-user')
      return { sid: END_USER }
    },
    createSupportingDocument: async (params) => {
      calls.push(`document:${params.type}:${params.mimeType}`)
      documents.push({ type: params.type, attributes: params.attributes })
      return {
        sid: params.type === 'commercial_registrar_excerpt' ? DOCUMENT : ADDRESS_DOCUMENT,
      }
    },
    createBundle: async () => {
      calls.push('bundle')
      return { sid: NEW_BUNDLE }
    },
    assignItem: async (bundleSid, objectSid) => {
      calls.push(`assign:${bundleSid}:${objectSid}`)
    },
    evaluateBundle: async () => {
      calls.push('evaluate')
      return { status: 'compliant', results: [] }
    },
    submitBundleForReview: async (bundleSid) => {
      calls.push(`submit:${bundleSid}`)
    },
  }
  return { calls, documents, ...base, ...overrides }
}

describe('submitComplianceToTwilio', () => {
  it('uploads a new proof onto a rejected bundle instead of creating another bundle', async () => {
    const twilio = port()
    const callback = jest.fn(async () => 'https://example.test/compliance')

    const outcome = await submitComplianceToTwilio(
      input({
        existingBundleSid: EXISTING_BUNDLE,
        existingEndUserSid: END_USER,
        createStatusCallback: callback,
      }),
      twilio,
    )

    expect(outcome).toMatchObject({
      kind: 'submitted',
      reusedBundle: true,
      bundleSid: EXISTING_BUNDLE,
      endUserSid: END_USER,
      documentSid: DOCUMENT,
      addressDocumentSid: ADDRESS_DOCUMENT,
    })
    expect(twilio.calls).toEqual([
      'fetch',
      'address',
      'document:commercial_registrar_excerpt:application/pdf',
      'document:utility_bill:application/pdf',
      `assign:${EXISTING_BUNDLE}:${DOCUMENT}`,
      `assign:${EXISTING_BUNDLE}:${ADDRESS_DOCUMENT}`,
      'evaluate',
      `submit:${EXISTING_BUNDLE}`,
    ])
    expect(callback).not.toHaveBeenCalled()
    expect(twilio.documents).toEqual([
      {
        type: 'commercial_registrar_excerpt',
        attributes: {
          business_name: 'Ensignth Pty Ltd',
          document_number: '12345678901',
          address_sids: [ADDRESS],
        },
      },
      {
        type: 'utility_bill',
        attributes: {
          address_sids: [ADDRESS],
        },
      },
    ])
  })

  it('does not submit a new bundle when evaluation says the excerpt is missing', async () => {
    const twilio = port({
      evaluateBundle: async () => ({
        status: 'noncompliant',
        results: [
          {
            passed: false,
            failure_reason:
              'An Excerpt from the commercial register is missing. Please add one to the regulatory bundle.',
          },
        ],
      }),
    })

    const outcome = await submitComplianceToTwilio(input(), twilio)

    expect(outcome.kind).toBe('not_compliant')
    if (outcome.kind !== 'not_compliant') return
    expect(outcome.bundleSid).toBe(NEW_BUNDLE)
    expect(outcome.failureReasons[0]).toContain('commercial register is missing')
    expect(twilio.calls).toContain('bundle')
    expect(twilio.calls.some((call) => call.startsWith('submit:'))).toBe(false)
  })

  it('rejects a proof of address that is not a PDF, JPEG, or PNG before calling Twilio', async () => {
    const twilio = port()

    await expect(
      submitComplianceToTwilio(
        input({
          addressProof: {
            file: Buffer.from('this is not a document'),
            filename: 'bill.txt',
            type: 'utility_bill',
          },
        }),
        twilio,
      ),
    ).rejects.toThrow(/PDF, JPEG, or PNG/)

    expect(twilio.calls).toEqual([])
  })
})
