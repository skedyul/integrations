import twilio from 'twilio'
import { AppAuthInvalidError } from 'skedyul'

export type TwilioEnv = {
  TWILIO_ACCOUNT_SID?: string
  TWILIO_AUTH_TOKEN?: string
}

/**
 * Check if a Twilio error indicates invalid authentication (401/403).
 * Twilio SDK errors include a `status` property with the HTTP status code.
 */
export function isTwilioAuthError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const errObj = error as Record<string, unknown>
    const status = (errObj.status ?? errObj.code) as number | undefined
    return status === 401 || status === 403 || status === 20003
    // 20003 = Twilio "Authentication Error" code
  }
  return false
}

/**
 * Wraps a Twilio SDK call and converts 401/403 errors to AppAuthInvalidError.
 */
export async function withTwilioAuth<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (isTwilioAuthError(error)) {
      throw new AppAuthInvalidError(
        `Twilio API authentication failed. Please re-authorize the app.`,
      )
    }
    throw error
  }
}

/**
 * Create a Twilio client from environment variables.
 */
export const createTwilioClient = (env: TwilioEnv) => {
  const accountSid = env.TWILIO_ACCOUNT_SID
  const authToken = env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) {
    throw new Error(
      'Missing Twilio credentials: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN required',
    )
  }

  return twilio(accountSid, authToken)
}

// ─────────────────────────────────────────────────────────────────────────────
// Twilio Compliance Status Mapping
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Twilio bundle status values.
 * @see https://www.twilio.com/docs/phone-numbers/regulatory/api
 */
export type TwilioBundleStatus =
  | 'draft'
  | 'pending-review'
  | 'in-review'
  | 'twilio-rejected'
  | 'twilio-approved'

/**
 * Internal compliance status values.
 */
export type ComplianceStatus =
  | 'PENDING'
  | 'SUBMITTED'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'

/**
 * Map Twilio bundle status to internal compliance status.
 */
export const mapTwilioStatusToInternal = (
  twilioStatus: TwilioBundleStatus,
): ComplianceStatus => {
  const statusMap: Record<TwilioBundleStatus, ComplianceStatus> = {
    draft: 'PENDING',
    'pending-review': 'PENDING_REVIEW',
    'in-review': 'PENDING_REVIEW',
    'twilio-rejected': 'REJECTED',
    'twilio-approved': 'APPROVED',
  }

  return statusMap[twilioStatus] ?? 'PENDING'
}

// ─────────────────────────────────────────────────────────────────────────────
// Regulatory Compliance Helpers
// ─────────────────────────────────────────────────────────────────────────────

export type CreateComplianceBundleParams = {
  friendlyName: string
  email: string
  statusCallback?: string
  regulationSid?: string
  isoCountry?: string
  endUserType?: 'individual' | 'business'
  numberType?: 'local' | 'mobile' | 'toll-free' | 'national'
}

export type CreateEndUserParams = {
  friendlyName: string
  type: 'individual' | 'business'
  attributes?: Record<string, string>
}

export type CreateSupportingDocumentParams = {
  friendlyName: string
  type: string
  attributes?: Record<string, string | string[]>
  /** File content as Buffer for document uploads */
  file?: Buffer
  /** MIME type of the file (e.g., 'application/pdf', 'image/jpeg') */
  mimeType?: string
}

export type CreateAddressParams = {
  customerName: string
  street: string
  city: string
  region: string
  postalCode: string
  isoCountry: string
}

/**
 * Create an Address for regulatory compliance.
 * Addresses are required for business compliance bundles.
 * 
 * @see https://www.twilio.com/docs/usage/api/address
 */
export const createAddress = async (
  client: ReturnType<typeof twilio>,
  params: CreateAddressParams,
) => {
  return withTwilioAuth(() =>
    client.addresses.create({
      customerName: params.customerName,
      street: params.street,
      city: params.city,
      region: params.region,
      postalCode: params.postalCode,
      isoCountry: params.isoCountry,
    }),
  )
}

/**
 * Create an End-User for regulatory compliance.
 */
export const createEndUser = async (
  client: ReturnType<typeof twilio>,
  params: CreateEndUserParams,
) => {
  return withTwilioAuth(() =>
    client.numbers.v2.regulatoryCompliance.endUsers.create({
      friendlyName: params.friendlyName,
      type: params.type,
      attributes: params.attributes,
    }),
  )
}

/**
 * Create a Supporting Document for regulatory compliance.
 * 
 * For document types that require proof (images/PDFs), pass the file content
 * via the `file` parameter. Twilio will validate against the document type.
 * 
 * @see https://www.twilio.com/docs/phone-numbers/regulatory/api/supporting-documents
 */
export const createSupportingDocument = async (
  client: ReturnType<typeof twilio>,
  params: CreateSupportingDocumentParams,
) => {
  // Build the create parameters
  const createParams: {
    friendlyName: string
    type: string
    attributes?: Record<string, string | string[]>
    file?: Buffer
  } = {
    friendlyName: params.friendlyName,
    type: params.type,
  }

  // Only include attributes if provided and not empty
  if (params.attributes && Object.keys(params.attributes).length > 0) {
    createParams.attributes = params.attributes
  }

  // Include file if provided (for document uploads with proof)
  if (params.file) {
    createParams.file = params.file
  }

  return withTwilioAuth(() =>
    client.numbers.v2.regulatoryCompliance.supportingDocuments.create(createParams),
  )
}

/**
 * Create a Regulatory Compliance Bundle.
 */
export const createBundle = async (
  client: ReturnType<typeof twilio>,
  params: CreateComplianceBundleParams,
) => {
  return withTwilioAuth(() =>
    client.numbers.v2.regulatoryCompliance.bundles.create({
      friendlyName: params.friendlyName,
      email: params.email,
      statusCallback: params.statusCallback,
      regulationSid: params.regulationSid,
      isoCountry: params.isoCountry,
      endUserType: params.endUserType,
      numberType: params.numberType,
    }),
  )
}

/**
 * Assign an item (End-User or Supporting Document) to a Bundle.
 */
export const assignItemToBundle = async (
  client: ReturnType<typeof twilio>,
  bundleSid: string,
  objectSid: string,
) => {
  return withTwilioAuth(() =>
    client.numbers.v2.regulatoryCompliance
      .bundles(bundleSid)
      .itemAssignments.create({ objectSid }),
  )
}

/**
 * Submit a Bundle for review by updating its status to 'pending-review'.
 */
export const submitBundleForReview = async (
  client: ReturnType<typeof twilio>,
  bundleSid: string,
) => {
  return withTwilioAuth(() =>
    client.numbers.v2.regulatoryCompliance.bundles(bundleSid).update({
      status: 'pending-review',
    }),
  )
}

/**
 * Fetch the current status of a Bundle.
 */
export const fetchBundleStatus = async (
  client: ReturnType<typeof twilio>,
  bundleSid: string,
) => {
  return withTwilioAuth(() =>
    client.numbers.v2.regulatoryCompliance.bundles(bundleSid).fetch(),
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Phone Number Provisioning Helpers
// ─────────────────────────────────────────────────────────────────────────────

export type SearchAvailablePhoneNumbersParams = {
  /** ISO 2-letter country code (e.g., 'AU', 'US') */
  countryCode: string
  /** Phone number type: 'local', 'mobile', or 'tollFree' */
  numberType?: 'local' | 'mobile' | 'tollFree'
  /** Filter for SMS-enabled numbers */
  smsEnabled?: boolean
  /** Filter for voice-enabled numbers */
  voiceEnabled?: boolean
  /** Filter for MMS-enabled numbers */
  mmsEnabled?: boolean
  /** Maximum number of results to return */
  limit?: number
}

export type AvailablePhoneNumber = {
  phoneNumber: string
  friendlyName: string
  locality: string | null
  region: string | null
  isoCountry: string
  capabilities: {
    voice: boolean
    sms: boolean
    mms: boolean
  }
}

/**
 * Search for available phone numbers in a specific country.
 * 
 * @see https://www.twilio.com/docs/phone-numbers/api/availablephonenumber-resource
 */
export const searchAvailablePhoneNumbers = async (
  client: ReturnType<typeof twilio>,
  params: SearchAvailablePhoneNumbersParams,
): Promise<AvailablePhoneNumber[]> => {
  const { countryCode, numberType = 'mobile', smsEnabled, voiceEnabled, mmsEnabled, limit = 10 } = params

  // Build the filter options
  const filterOptions: {
    smsEnabled?: boolean
    voiceEnabled?: boolean
    mmsEnabled?: boolean
    limit?: number
  } = { limit }

  if (smsEnabled !== undefined) filterOptions.smsEnabled = smsEnabled
  if (voiceEnabled !== undefined) filterOptions.voiceEnabled = voiceEnabled
  if (mmsEnabled !== undefined) filterOptions.mmsEnabled = mmsEnabled

  // Select the appropriate subresource based on number type
  let numbers: Array<{
    phoneNumber: string
    friendlyName: string
    locality: string | null
    region: string | null
    isoCountry: string
    capabilities: { voice: boolean; sms: boolean; mms: boolean }
  }>

  switch (numberType) {
    case 'local':
      numbers = await withTwilioAuth(() =>
        client.availablePhoneNumbers(countryCode).local.list(filterOptions),
      )
      break
    case 'tollFree':
      numbers = await withTwilioAuth(() =>
        client.availablePhoneNumbers(countryCode).tollFree.list(filterOptions),
      )
      break
    case 'mobile':
    default:
      numbers = await withTwilioAuth(() =>
        client.availablePhoneNumbers(countryCode).mobile.list(filterOptions),
      )
      break
  }

  return numbers.map((n) => ({
    phoneNumber: n.phoneNumber,
    friendlyName: n.friendlyName,
    locality: n.locality,
    region: n.region,
    isoCountry: n.isoCountry,
    capabilities: {
      voice: n.capabilities.voice,
      sms: n.capabilities.sms,
      mms: n.capabilities.mms,
    },
  }))
}

export type PurchasePhoneNumberParams = {
  /** The phone number to purchase in E.164 format */
  phoneNumber: string
  /** Optional friendly name for the number */
  friendlyName?: string
  /** Optional webhook URL for incoming SMS */
  smsUrl?: string
  /** Optional webhook URL for incoming voice calls */
  voiceUrl?: string
  /** Twilio Address SID (required for AU and other regulated countries) */
  addressSid?: string
  /** Twilio Regulatory Bundle SID (required for AU and other regulated countries) */
  bundleSid?: string
}

export type PurchasedPhoneNumber = {
  sid: string
  phoneNumber: string
  friendlyName: string
  capabilities: {
    voice: boolean
    sms: boolean
    mms: boolean
  }
}

/**
 * Purchase a phone number from Twilio.
 * 
 * For regulated countries (like Australia), you must provide:
 * - addressSid: Twilio Address SID for the business
 * - bundleSid: Approved Regulatory Bundle SID
 * 
 * @see https://www.twilio.com/docs/phone-numbers/api/incomingphonenumber-resource
 */
export const purchasePhoneNumber = async (
  client: ReturnType<typeof twilio>,
  params: PurchasePhoneNumberParams,
): Promise<PurchasedPhoneNumber> => {
  const createParams: {
    phoneNumber: string
    friendlyName?: string
    smsUrl?: string
    voiceUrl?: string
    addressSid?: string
    bundleSid?: string
  } = {
    phoneNumber: params.phoneNumber,
  }

  if (params.friendlyName) createParams.friendlyName = params.friendlyName
  if (params.smsUrl) createParams.smsUrl = params.smsUrl
  if (params.voiceUrl) createParams.voiceUrl = params.voiceUrl
  if (params.addressSid) createParams.addressSid = params.addressSid
  if (params.bundleSid) createParams.bundleSid = params.bundleSid

  const purchased = await withTwilioAuth(() =>
    client.incomingPhoneNumbers.create(createParams),
  )

  return {
    sid: purchased.sid,
    phoneNumber: purchased.phoneNumber,
    friendlyName: purchased.friendlyName,
    capabilities: {
      voice: purchased.capabilities.voice,
      sms: purchased.capabilities.sms,
      mms: purchased.capabilities.mms,
    },
  }
}
