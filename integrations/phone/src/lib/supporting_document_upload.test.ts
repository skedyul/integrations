import { describe, expect, it } from '@jest/globals'
import {
  SUPPORTING_DOCUMENT_UPLOAD_URL,
  buildSupportingDocumentForm,
  parseSupportingDocumentUpload,
  resolveDocumentMimeType,
  supportingDocumentFilename,
  uploadSupportingDocument,
} from './supporting_document_upload'

const DOCUMENT_SID = 'RDd6340f49f352d06b77e7017d93591483'
const ADDRESS_SID = 'AD9c343ebac6809bd0508d3e87f1404d2d'

const uploadParams = {
  friendlyName: 'Skedyul - Commercial Register Excerpt',
  type: 'commercial_registrar_excerpt',
  filename: 'asic-extract.pdf',
  mimeType: 'application/pdf',
  file: Buffer.from('%PDF-1.4 extract'),
  attributes: {
    business_name: 'Skedyul',
    document_number: '28666717415',
    address_sids: [ADDRESS_SID],
  },
}

describe('buildSupportingDocumentForm', () => {
  it('sends the proof file and document number as multipart fields', () => {
    const form = buildSupportingDocumentForm(uploadParams)

    expect(form.get('FriendlyName')).toBe(uploadParams.friendlyName)
    expect(form.get('Type')).toBe('commercial_registrar_excerpt')
    expect(JSON.parse(String(form.get('Attributes')))).toEqual(uploadParams.attributes)

    const uploaded = form.get('File') as File
    expect(uploaded).toBeInstanceOf(File)
    expect(uploaded.name).toBe('asic-extract.pdf')
    expect(uploaded.type).toBe('application/pdf')
    expect(uploaded.size).toBe(uploadParams.file.length)
  })

  it('rejects an empty proof file', () => {
    expect(() =>
      buildSupportingDocumentForm({
        ...uploadParams,
        file: Buffer.alloc(0),
      }),
    ).toThrow('Supporting document file is empty')
  })

  it('sniffs a PDF when the stored type is generic', () => {
    expect(resolveDocumentMimeType(Buffer.from('%PDF-1.4'), 'application/octet-stream')).toBe(
      'application/pdf',
    )
    expect(supportingDocumentFilename('extract', 'application/pdf')).toBe('extract.pdf')
    expect(supportingDocumentFilename(undefined, 'image/png')).toBe('commercial-register.png')
  })
})

describe('parseSupportingDocumentUpload', () => {
  it('returns the document sid when Twilio stored the file', () => {
    expect(
      parseSupportingDocumentUpload(201, {
        sid: DOCUMENT_SID,
        mime_type: 'application/pdf',
      }),
    ).toEqual({ sid: DOCUMENT_SID, mimeType: 'application/pdf' })
  })

  it('treats a document record without a mime type as a missing file', () => {
    expect(() =>
      parseSupportingDocumentUpload(201, {
        sid: DOCUMENT_SID,
        mime_type: '',
      }),
    ).toThrow('without the uploaded file')
  })

  it('surfaces the Twilio error message', () => {
    expect(() =>
      parseSupportingDocumentUpload(400, {
        message: 'The uploaded document does not match the Regulatory Requirements criteria',
        status: 400,
      }),
    ).toThrow('does not match the Regulatory Requirements criteria')
  })
})

describe('uploadSupportingDocument', () => {
  it('posts the file to the numbers upload host with basic auth', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init: init ?? {} })
      return new Response(
        JSON.stringify({ sid: DOCUMENT_SID, mime_type: 'application/pdf' }),
        { status: 201, headers: { 'content-type': 'application/json' } },
      )
    }) as typeof fetch

    const result = await uploadSupportingDocument(
      { username: 'ACaccount', password: 'token' },
      uploadParams,
      fetchImpl,
    )

    expect(result).toEqual({ sid: DOCUMENT_SID, mimeType: 'application/pdf' })
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe(SUPPORTING_DOCUMENT_UPLOAD_URL)
    expect(calls[0].init.method).toBe('POST')
    expect(calls[0].init.headers).toEqual({
      Authorization: `Basic ${Buffer.from('ACaccount:token').toString('base64')}`,
    })

    const body = calls[0].init.body as FormData
    expect(body.get('Type')).toBe('commercial_registrar_excerpt')
    expect((body.get('File') as File).name).toBe('asic-extract.pdf')
  })
})
