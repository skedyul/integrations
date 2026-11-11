import { assertAcceptedProofBytes } from './supporting_document_upload'
import {
  collectEvaluationFailures,
  isReusableBundleStatus,
  type BundleEvaluationPayload,
} from './compliance_evaluation'

export type ComplianceAddressInput = {
  customerName: string
  street: string
  city: string
  region: string
  postalCode: string
  isoCountry: string
}

export const ADDRESS_PROOF_DOCUMENT_TYPES = [
  'utility_bill',
  'tax_document',
  'rental_receipt',
  'title_deed',
] as const

export type AddressProofDocumentType = (typeof ADDRESS_PROOF_DOCUMENT_TYPES)[number]

export function isAddressProofDocumentType(value: string): value is AddressProofDocumentType {
  return (ADDRESS_PROOF_DOCUMENT_TYPES as readonly string[]).includes(value)
}

export type ComplianceSubmissionInput = {
  existingBundleSid?: string
  existingEndUserSid?: string
  businessName: string
  businessEmail: string
  businessId: string
  isoCountry: string
  address: ComplianceAddressInput
  proof: {
    file: Buffer
    filename?: string
  }
  addressProof: {
    file: Buffer
    filename?: string
    type: AddressProofDocumentType
  }
  friendlyBundleName: string
  /** Called only when a new bundle is created. */
  createStatusCallback: () => Promise<string>
}

export type ComplianceTwilioPort = {
  fetchBundleStatus: (bundleSid: string) => Promise<{ status: string }>
  createAddress: (address: ComplianceAddressInput) => Promise<{ sid: string }>
  createEndUser: (params: { friendlyName: string; businessName: string }) => Promise<{ sid: string }>
  createSupportingDocument: (params: {
    friendlyName: string
    type: string
    file: Buffer
    filename?: string
    mimeType: string
    attributes: Record<string, string | string[]>
  }) => Promise<{ sid: string }>
  createBundle: (params: {
    friendlyName: string
    email: string
    statusCallback: string
    isoCountry: string
  }) => Promise<{ sid: string }>
  assignItem: (bundleSid: string, objectSid: string) => Promise<void>
  evaluateBundle: (bundleSid: string) => Promise<BundleEvaluationPayload>
  submitBundleForReview: (bundleSid: string) => Promise<void>
}

export type ComplianceSubmissionOutcome =
  | {
      kind: 'submitted'
      reusedBundle: boolean
      bundleSid: string
      endUserSid: string
      documentSid: string
      addressDocumentSid: string
      addressSid: string
    }
  | {
      kind: 'not_compliant'
      reusedBundle: boolean
      bundleSid: string
      endUserSid?: string
      documentSid: string
      addressDocumentSid: string
      addressSid: string
      failureReasons: string[]
    }
  | {
      kind: 'blocked'
      bundleSid: string
      twilioStatus: string
    }

/**
 * Upload the commercial-register excerpt and a separate proof of address,
 * attach both to a bundle, and submit only when Twilio's evaluation is
 * compliant. An existing draft or rejected bundle is reused so a failed
 * upload does not open a second bundle.
 */
export async function submitComplianceToTwilio(
  input: ComplianceSubmissionInput,
  twilio: ComplianceTwilioPort,
): Promise<ComplianceSubmissionOutcome> {
  const registrationMime = assertAcceptedProofBytes(input.proof.file)
  const addressProofMime = assertAcceptedProofBytes(input.addressProof.file)
  if (!isAddressProofDocumentType(input.addressProof.type)) {
    throw new Error(
      'Proof of address must be a utility bill, tax notice, rent receipt, or title deed',
    )
  }

  let reusedBundle = false
  let bundleSid = input.existingBundleSid
  let endUserSid = input.existingEndUserSid

  if (bundleSid) {
    const current = await twilio.fetchBundleStatus(bundleSid)
    if (!isReusableBundleStatus(current.status)) {
      return { kind: 'blocked', bundleSid, twilioStatus: current.status }
    }
    reusedBundle = true
  }

  const address = await twilio.createAddress(input.address)
  const document = await twilio.createSupportingDocument({
    friendlyName: `${input.businessName} - Commercial Register Excerpt`,
    type: 'commercial_registrar_excerpt',
    file: input.proof.file,
    filename: input.proof.filename,
    mimeType: registrationMime,
    attributes: {
      business_name: input.businessName,
      document_number: input.businessId,
      address_sids: [address.sid],
    },
  })
  const addressDocument = await twilio.createSupportingDocument({
    friendlyName: `${input.businessName} - Proof of Address`,
    type: input.addressProof.type,
    file: input.addressProof.file,
    filename: input.addressProof.filename ?? 'proof-of-address',
    mimeType: addressProofMime,
    attributes: {
      address_sids: [address.sid],
    },
  })

  if (!reusedBundle || !bundleSid) {
    const endUser = await twilio.createEndUser({
      friendlyName: input.businessName,
      businessName: input.businessName,
    })
    endUserSid = endUser.sid
    const statusCallback = await input.createStatusCallback()
    const bundle = await twilio.createBundle({
      friendlyName: input.friendlyBundleName,
      email: input.businessEmail,
      statusCallback,
      isoCountry: input.isoCountry,
    })
    bundleSid = bundle.sid
    await twilio.assignItem(bundleSid, endUser.sid)
  } else if (!endUserSid) {
    const endUser = await twilio.createEndUser({
      friendlyName: input.businessName,
      businessName: input.businessName,
    })
    endUserSid = endUser.sid
    await twilio.assignItem(bundleSid, endUser.sid)
  }

  await twilio.assignItem(bundleSid, document.sid)
  await twilio.assignItem(bundleSid, addressDocument.sid)

  const evaluation = await twilio.evaluateBundle(bundleSid)
  const failureReasons = collectEvaluationFailures(evaluation)
  if (failureReasons.length > 0) {
    return {
      kind: 'not_compliant',
      reusedBundle,
      bundleSid,
      endUserSid,
      documentSid: document.sid,
      addressDocumentSid: addressDocument.sid,
      addressSid: address.sid,
      failureReasons,
    }
  }

  await twilio.submitBundleForReview(bundleSid)

  if (!endUserSid) {
    throw new Error('Compliance bundle is missing an end user')
  }

  return {
    kind: 'submitted',
    reusedBundle,
    bundleSid,
    endUserSid,
    documentSid: document.sid,
    addressDocumentSid: addressDocument.sid,
    addressSid: address.sid,
  }
}
