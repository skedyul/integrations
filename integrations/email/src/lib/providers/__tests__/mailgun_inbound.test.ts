import { describe, expect, it, jest } from '@jest/globals'
import {
  fetchMailgunAttachment,
  mailgunBasicAuthHeader,
  parseMailgunAttachments,
  parseMailgunFormBody,
} from '../mailgun_inbound'

describe('parseMailgunFormBody', () => {
  it('parses url-encoded form fields', () => {
    const body = parseMailgunFormBody(
      'sender=a%40example.com&recipient=b%40example.com&subject=Hi',
    )
    expect(body.sender).toBe('a@example.com')
    expect(body.recipient).toBe('b@example.com')
    expect(body.subject).toBe('Hi')
  })

  it('returns objects unchanged', () => {
    const input = { attachments: '[]', sender: 'a@example.com' }
    expect(parseMailgunFormBody(input)).toBe(input)
  })
})

describe('parseMailgunAttachments', () => {
  const sample = [
    {
      name: 'report.pdf',
      'content-type': 'application/pdf',
      size: 2048,
      url: 'https://storage.mailgun.net/v3/domains/ex/messages/abc/attachments/0',
    },
  ]

  it('parses the store(notify) JSON string', () => {
    expect(parseMailgunAttachments(JSON.stringify(sample))).toEqual([
      {
        name: 'report.pdf',
        contentType: 'application/pdf',
        size: 2048,
        url: sample[0].url,
      },
    ])
  })

  it('accepts an already-parsed array and content_type aliases', () => {
    expect(
      parseMailgunAttachments([
        {
          name: 'photo.jpg',
          content_type: 'image/jpeg',
          size: '100',
          url: 'https://storage.mailgun.net/a',
        },
      ]),
    ).toEqual([
      {
        name: 'photo.jpg',
        contentType: 'image/jpeg',
        size: 100,
        url: 'https://storage.mailgun.net/a',
      },
    ])
  })

  it('returns empty for missing, invalid, or url-less payloads', () => {
    expect(parseMailgunAttachments(undefined)).toEqual([])
    expect(parseMailgunAttachments('not-json')).toEqual([])
    expect(parseMailgunAttachments({ name: 'x' })).toEqual([])
    expect(parseMailgunAttachments([{ name: 'x', size: 1 }])).toEqual([])
  })
})

describe('fetchMailgunAttachment', () => {
  it('sends Basic auth on the first request and returns the body', async () => {
    const fetchImpl = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    } as Response)

    const buffer = await fetchMailgunAttachment(
      'https://storage.mailgun.net/v3/attachments/0',
      'key-123',
      fetchImpl,
      5_000,
    )

    expect(buffer.equals(Buffer.from([1, 2, 3]))).toBe(true)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const init = fetchImpl.mock.calls[0][1] as RequestInit
    expect(init.headers).toEqual({
      Authorization: `Basic ${mailgunBasicAuthHeader('key-123')}`,
    })
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('does not retry unauthenticated after 403', async () => {
    const fetchImpl = jest.fn<typeof fetch>().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    } as Response)

    await expect(
      fetchMailgunAttachment(
        'https://storage.mailgun.net/v3/attachments/0',
        'key-123',
        fetchImpl,
      ),
    ).rejects.toThrow('Failed to fetch attachment: 403 Forbidden')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})
