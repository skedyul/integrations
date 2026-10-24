/**
 * Upload a Regulatory Compliance supporting document with its proof file.
 *
 * The Twilio Node helper's `supportingDocuments.create` only sends
 * FriendlyName, Type, and Attributes as form-urlencoded data to
 * numbers.twilio.com. It drops any file. Proof must be multipart `File` on
 * https://numbers-upload.twilio.com or Twilio reviews an empty document.
 *
 * @see https://www.twilio.com/docs/phone-numbers/regulatory/getting-started/create-new-bundle-public-rest-apis
 */

export const SUPPORTING_DOCUMENT_UPLOAD_URL =
  'https://numbers-upload.twilio.com/v2/RegulatoryCompliance/SupportingDocuments'

export type SupportingDocumentUploadAuth = {
  username?: string
  password?: string
}

export type SupportingDocumentUploadParams = {
  friendlyName: string
  type: string
  attributes?: Record<string, string | string[]>
  file?: Buffer
  filename?: string
  mimeType?: string
}

export type SupportingDocumentUploadResult = {
  sid: string
  mimeType: string
}

const MIME_EXTENSION: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
}

export function twilioBasicAuthorization(auth: SupportingDocumentUploadAuth): string {
  const username = auth.username?.trim()
  const password = auth.password?.trim()
  if (!username || !password) {
    throw new Error('Missing Twilio credentials for document upload')
  }
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
}

/** Drop parameters and generic binary types so a real document type can win. */
export function normalizeDocumentMimeType(
  value: string | null | undefined,
): string | undefined {
  const mime = value?.split(';')[0]?.trim().toLowerCase()
  if (!mime || mime === 'application/octet-stream' || mime === 'binary/octet-stream') {
    return undefined
  }
  return mime
}

export function sniffDocumentMimeType(file: Buffer): string | undefined {
  if (file.length >= 4 && file.subarray(0, 4).toString('utf8') === '%PDF') {
    return 'application/pdf'
  }
  if (file.length >= 3 && file[0] === 0xff && file[1] === 0xd8 && file[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    file.length >= 8 &&
    file[0] === 0x89 &&
    file[1] === 0x50 &&
    file[2] === 0x4e &&
    file[3] === 0x47
  ) {
    return 'image/png'
  }
  return undefined
}

export function supportingDocumentFilename(
  name: string | undefined,
  mimeType: string | undefined,
): string {
  const base = (name ?? '').split(/[/\\]/).pop()?.trim() ?? ''
  const ext = MIME_EXTENSION[mimeType ?? ''] ?? 'bin'
  if (!base) return `commercial-register.${ext}`
  if (/\.[a-z0-9]{2,5}$/i.test(base)) return base
  return `${base}.${ext}`
}

export function resolveDocumentMimeType(
  file: Buffer,
  declared: string | null | undefined,
): string {
  return (
    normalizeDocumentMimeType(declared) ??
    sniffDocumentMimeType(file) ??
    'application/octet-stream'
  )
}

export function buildSupportingDocumentForm(
  params: SupportingDocumentUploadParams,
): FormData {
  const form = new FormData()
  form.append('FriendlyName', params.friendlyName)
  form.append('Type', params.type)
  if (params.attributes && Object.keys(params.attributes).length > 0) {
    form.append('Attributes', JSON.stringify(params.attributes))
  }
  if (!params.file) return form
  if (params.file.length === 0) {
    throw new Error('Supporting document file is empty')
  }

  const mimeType = resolveDocumentMimeType(params.file, params.mimeType)
  const filename = supportingDocumentFilename(params.filename, mimeType)
  form.append(
    'File',
    new Blob([new Uint8Array(params.file)], { type: mimeType }),
    filename,
  )
  return form
}

export function parseSupportingDocumentUpload(
  status: number,
  body: unknown,
): SupportingDocumentUploadResult {
  const record =
    body && typeof body === 'object' ? (body as Record<string, unknown>) : {}

  if (status < 200 || status >= 300) {
    const message =
      typeof record.message === 'string' && record.message.trim()
        ? record.message
        : `Twilio document upload failed (${status})`
    const error = new Error(message) as Error & { status?: number; code?: number }
    error.status = status
    if (typeof record.code === 'number') error.code = record.code
    throw error
  }

  const sid = typeof record.sid === 'string' ? record.sid : ''
  if (!/^RD[0-9a-f]{32}$/i.test(sid)) {
    throw new Error('Twilio document upload did not return a supporting document SID')
  }

  const rawMime =
    (typeof record.mime_type === 'string' && record.mime_type) ||
    (typeof record.mimeType === 'string' && record.mimeType) ||
    ''
  const mimeType = rawMime.trim()
  if (!mimeType) {
    throw new Error(
      'Twilio stored the supporting document without the uploaded file. The commercial register excerpt was not attached.',
    )
  }

  return { sid, mimeType }
}

export async function uploadSupportingDocument(
  auth: SupportingDocumentUploadAuth,
  params: SupportingDocumentUploadParams,
  fetchImpl: typeof fetch = fetch,
): Promise<SupportingDocumentUploadResult> {
  if (!params.file || params.file.length === 0) {
    throw new Error('Supporting document file is empty')
  }

  const response = await fetchImpl(SUPPORTING_DOCUMENT_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: twilioBasicAuthorization(auth),
    },
    body: buildSupportingDocumentForm(params),
  })

  const text = await response.text()
  let body: unknown = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = { message: text }
    }
  }

  return parseSupportingDocumentUpload(response.status, body)
}
