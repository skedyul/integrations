import { describe, expect, it, beforeEach, jest } from '@jest/globals'
import { resetReaClientTokenCache } from '../rea-client'
import { ensureReaAllOwnersSubscription } from '../ensure-rea-webhooks'

function mockReaFetch(options: {
  subscriptions: Array<Record<string, unknown>>
  createdId?: string
}) {
  const deleted: string[] = []
  const created: Array<Record<string, unknown>> = []

  const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input)
    if (url.includes('/oauth/token')) {
      return new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (url.includes('/webhooks/v1/subscriptions') && !init?.method) {
      return new Response(JSON.stringify({ subscriptions: options.subscriptions }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (url.includes('/webhooks/v1/subscriptions/') && init?.method === 'DELETE') {
      const id = url.split('/').pop() as string
      deleted.push(id)
      return new Response(null, { status: 204 })
    }
    if (url.includes('/webhooks/v1/subscriptions') && init?.method === 'POST') {
      const body = JSON.parse(String(init.body))
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

  return { fetchMock, deleted, created }
}

describe('ensureReaAllOwnersSubscription', () => {
  const env = {
    REA_CLIENT_ID: 'client-id',
    REA_CLIENT_SECRET: 'client-secret',
  }
  const spec = { eventType: 'EnquiryCreated', eventCategory: 'lead' }
  const installUrl = 'https://admin.skedyul.it/api/webhooks/whreg_install'

  beforeEach(() => {
    resetReaClientTokenCache()
    jest.restoreAllMocks()
  })

  it('keeps an all-owners sub that already points at the install URL', async () => {
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

    await expect(
      ensureReaAllOwnersSubscription(env, installUrl, spec),
    ).resolves.toEqual({
      subscriptionId: 'sub-install',
      created: false,
      action: 'kept',
    })
  })

  it('retargets a leftover all-owners sub on a different URL', async () => {
    const { deleted, created } = mockReaFetch({
      subscriptions: [
        {
          subscriptionId: 'sub-provision',
          eventType: 'EnquiryCreated',
          eventCategory: 'lead',
          webhookUrl: 'https://admin.skedyul.it/api/webhooks/whreg_provision',
        },
      ],
      createdId: 'sub-retargeted',
    })

    await expect(
      ensureReaAllOwnersSubscription(env, installUrl, spec),
    ).resolves.toEqual({
      subscriptionId: 'sub-retargeted',
      status: 'ACTIVE',
      created: true,
      action: 'retargeted',
      previousUrl: 'https://admin.skedyul.it/api/webhooks/whreg_provision',
    })

    expect(deleted).toEqual(['sub-provision'])
    expect(created).toEqual([
      {
        eventType: 'EnquiryCreated',
        eventCategory: 'lead',
        webhookUrl: installUrl,
      },
    ])
  })

  it('creates an all-owners sub when none exists', async () => {
    const { created } = mockReaFetch({
      subscriptions: [],
      createdId: 'sub-created',
    })

    await expect(
      ensureReaAllOwnersSubscription(env, installUrl, spec),
    ).resolves.toEqual({
      subscriptionId: 'sub-created',
      status: 'ACTIVE',
      created: true,
      action: 'created',
    })

    expect(created).toHaveLength(1)
  })
})
