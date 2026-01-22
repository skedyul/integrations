import twilio from 'twilio'

export type TwilioEnv = {
  TWILIO_ACCOUNT_SID?: string
  TWILIO_AUTH_TOKEN?: string
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
  attributes?: Record<string, string>
  /** File content as Buffer for document uploads */
  file?: Buffer
  /** MIME type of the file (e.g., 'application/pdf', 'image/jpeg') */
  mimeType?: string
}

/**
 * Create an End-User for regulatory compliance.
 */
export const createEndUser = async (
  client: ReturnType<typeof twilio>,
  params: CreateEndUserParams,
) => {
  return client.numbers.v2.regulatoryCompliance.endUsers.create({
    friendlyName: params.friendlyName,
    type: params.type,
    attributes: params.attributes,
  })
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
    attributes?: Record<string, string>
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

  return client.numbers.v2.regulatoryCompliance.supportingDocuments.create(createParams)
}

/**
 * Create a Regulatory Compliance Bundle.
 */
export const createBundle = async (
  client: ReturnType<typeof twilio>,
  params: CreateComplianceBundleParams,
) => {
  return client.numbers.v2.regulatoryCompliance.bundles.create({
    friendlyName: params.friendlyName,
    email: params.email,
    statusCallback: params.statusCallback,
    regulationSid: params.regulationSid,
    isoCountry: params.isoCountry,
    endUserType: params.endUserType,
    numberType: params.numberType,
  })
}

/**
 * Assign an item (End-User or Supporting Document) to a Bundle.
 */
export const assignItemToBundle = async (
  client: ReturnType<typeof twilio>,
  bundleSid: string,
  objectSid: string,
) => {
  return client.numbers.v2.regulatoryCompliance
    .bundles(bundleSid)
    .itemAssignments.create({ objectSid })
}

/**
 * Submit a Bundle for review by updating its status to 'pending-review'.
 */
export const submitBundleForReview = async (
  client: ReturnType<typeof twilio>,
  bundleSid: string,
) => {
  return client.numbers.v2.regulatoryCompliance.bundles(bundleSid).update({
    status: 'pending-review',
  })
}

/**
 * Fetch the current status of a Bundle.
 */
export const fetchBundleStatus = async (
  client: ReturnType<typeof twilio>,
  bundleSid: string,
) => {
  return client.numbers.v2.regulatoryCompliance.bundles(bundleSid).fetch()
}
