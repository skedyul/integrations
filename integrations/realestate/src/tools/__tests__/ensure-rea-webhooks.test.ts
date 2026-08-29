import { describe, expect, it, beforeEach, jest } from '@jest/globals'
import { resetReaClientTokenCache } from '../../lib/rea-client'

const webhookList = jest.fn<(args: { name: string }) => Promise<{
  webhooks: Array<{ id: string; url: string; name: string }>
}>>()
const webhookCreate = jest.fn()

const schema = {
  optional() {
    return this
  },
}

jest.unstable_mockModule('skedyul', () => ({
  z: {
    object: () => schema,
    string: () => schema,
    number: () => schema,
    array: () => schema,
    enum: () => schema,
  },
  createSuccessResponse: (output: unknown) => ({ success: true, output }),
  createValidationError: (message: string) => ({
    success: false,
    error: { code: 'VALIDATION_ERROR', message },
  }),
  createExternalError: (service: string, message: string) => ({
    success: false,
    error: {
      code: 'EXTERNAL_SERVICE_ERROR',
      message: `${service}: ${message}`,
      category: 'external',
    },
  }),
  webhook: {
    list: webhookList,
    create: webhookCreate,
  },
}))

const { ensureReaWebhooksRegistry } = await import('../ensure-rea-webhooks')

const installUrl = 'https://admin.skedyul.it/api/webhooks/whreg_install'

function mockReaFetch(options: {
  subscriptions: Array<Record<string, unknown>>
  createdId?: string
}) {
  const created: Array<Record<string, unknown>> = []

  jest.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input)
    if (url.includes('/me/v1/integrations')) {
      return new Response(
        JSON.stringify({
          _embedded: {
            integrations: [
              {
                integrationId: 'int-1',
                ownerId: 'GHBDWE',
                ownerType: 'agency',
                scopes: ['lead:enquiries:read'],
              },
            ],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (url.includes('/lead/v1/enquiries')) {
      return new Response(
        JSON.stringify({
          _embedded: {
            enquiry: [
              {
                id: 'enquiry-recent',
                agencyId: 'GHBDWE',
                receivedAt: '2026-08-29T10:50:00.000Z',
                type: 'REALESTATE_COM_AU_LISTING',
              },
            ],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (url.includes('/oauth/token')) {
      return new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (url.includes('/webhooks/v1/subscriptions') && url.includes('/delivery') && !init?.method) {
      return new Response(
        JSON.stringify({
          deliveries: [
            {
              attemptId: 'attempt-1',
              deliveryId: 'delivery-1',
              statusCode: 200,
              outcome: 'Ok',
              createdAt: '2026-08-29T10:00:00.000Z',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (url.includes('/webhooks/v1/subscriptions') && !init?.method) {
      return new Response(JSON.stringify({ subscriptions: options.subscriptions }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (url.includes('/webhooks/v1/subscriptions/') && init?.method === 'DELETE') {
      return new Response(null, { status: 204 })
    }
    if (url.includes('/webhooks/v1/subscriptions') && init?.method === 'POST') {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>
      if (body.eventCategory === 'integration' || String(body.eventType).startsWith('Integration')) {
        return new Response(
          JSON.stringify({
            errors: [
              {
                errorType: 'INVALID_EVENT_CATEGORY',
                message: 'Invalid event category',
              },
            ],
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        )
      }
      created.push(body)
      return new Response(
        JSON.stringify({
          subscriptionId: options.createdId ?? 'sub-new',
          status: 'ACTIVE',
          ...body,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    return new Response('not found', { status: 404 })
  })

  return { created }
}

describe('ensure_rea_webhooks', () => {
  const env = {
    REA_CLIENT_ID: 'client-id',
    REA_CLIENT_SECRET: 'client-secret',
  }

  beforeEach(() => {
    resetReaClientTokenCache()
    jest.restoreAllMocks()
    webhookList.mockReset()
    webhookCreate.mockReset()
    webhookList.mockResolvedValue({
      webhooks: [{ id: 'whreg_install', url: installUrl, name: 'enquiry_created' }],
    })
  })

  it('creates EnquiryCreated even when Integration* POSTs would 400 INVALID_EVENT_CATEGORY', async () => {
    const { created } = mockReaFetch({
      subscriptions: [],
      createdId: 'sub-lead',
    })

    const result = await ensureReaWebhooksRegistry.handler({}, { env } as never)

    expect(result.success).toBe(true)
    if (!result.success) {
      throw new Error(result.error.message)
    }

    expect(result.output.leadAction).toBe('created')
    expect(result.output.leadSubscriptionId).toBe('sub-lead')
    expect(result.output.enquiryWebhookUrl).toBe(installUrl)
    expect(result.output.message).toContain(installUrl)
    expect(result.output.deliveries[0]?.outcome).toBe('Ok')
    expect(result.output.message).toContain('Latest REA delivery')
    expect(result.output.recentEnquiries[0]?.id).toBe('enquiry-recent')
    expect(result.output.message).toContain('REA Leads API has')
    expect(created).toEqual([
      {
        eventType: 'EnquiryCreated',
        eventCategory: 'lead',
        webhookUrl: installUrl,
      },
    ])
    expect(webhookCreate).not.toHaveBeenCalled()
    expect(webhookList.mock.calls.every(([args]) => args.name === 'enquiry_created')).toBe(
      true,
    )
  })

  it('keeps an existing EnquiryCreated URL without touching Integration*', async () => {
    mockReaFetch({
      subscriptions: [
        {
          subscriptionId: 'sub-install',
          eventType: 'EnquiryCreated',
          eventCategory: 'lead',
          webhookUrl: installUrl,
        },
      ],
    })

    const result = await ensureReaWebhooksRegistry.handler({}, { env } as never)

    expect(result.success).toBe(true)
    if (!result.success) {
      throw new Error(result.error.message)
    }

    expect(result.output.leadAction).toBe('kept')
    expect(result.output.leadSubscriptionId).toBe('sub-install')
  })
})
