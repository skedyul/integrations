import { describe, expect, it, beforeEach, jest } from '@jest/globals'
import { ReaClient, resetReaClientTokenCache } from '../rea-client'
import type { ReaWebhookSubscription } from '../rea-types'

describe('ReaClient.findLeadSubscription', () => {
  const subscriptions: ReaWebhookSubscription[] = [
    {
      subscriptionId: 'sub-all',
      eventType: 'EnquiryCreated',
      eventCategory: 'lead',
      webhookUrl: 'https://example.com/all',
    },
    {
      subscriptionId: 'sub-agency',
      eventType: 'EnquiryCreated',
      eventCategory: 'lead',
      webhookUrl: 'https://example.com/abcdef',
      ownerId: 'ABCDEF',
      ownerType: 'agency',
    },
  ]

  let client: ReaClient

  beforeEach(() => {
    resetReaClientTokenCache()
    client = new ReaClient({
      REA_CLIENT_ID: 'client-id',
      REA_CLIENT_SECRET: 'client-secret',
    })
  })

  it('finds all-owners subscription', () => {
    const found = client.findLeadSubscription(subscriptions, { allOwners: true })
    expect(found?.subscriptionId).toBe('sub-all')
  })

  it('finds agency subscription by owner and URL', () => {
    const found = client.findLeadSubscription(subscriptions, {
      ownerId: 'ABCDEF',
      webhookUrl: 'https://example.com/abcdef',
    })
    expect(found?.subscriptionId).toBe('sub-agency')
  })

  it('returns undefined when no match', () => {
    const found = client.findLeadSubscription(subscriptions, {
      ownerId: 'ZZZZZZ',
    })
    expect(found).toBeUndefined()
  })
})

describe('ReaClient.deleteWebhookSubscription', () => {
  beforeEach(() => {
    resetReaClientTokenCache()
    jest.restoreAllMocks()
  })

  it('sends DELETE request for subscription', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.includes('/oauth/token')) {
        return new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (url.includes('/webhooks/v1/subscriptions/sub-1') && init?.method === 'DELETE') {
        return new Response(null, { status: 204 })
      }
      return new Response('not found', { status: 404 })
    })

    const client = new ReaClient({
      REA_CLIENT_ID: 'client-id',
      REA_CLIENT_SECRET: 'client-secret',
    })

    await client.deleteWebhookSubscription('sub-1')

    expect(fetchMock).toHaveBeenCalled()
    const deleteCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).includes('/webhooks/v1/subscriptions/sub-1') && init?.method === 'DELETE',
    )
    expect(deleteCall).toBeDefined()
  })
})

describe('ReaClient.createLeadWebhookSubscription', () => {
  beforeEach(() => {
    resetReaClientTokenCache()
    jest.restoreAllMocks()
  })

  it('includes ownerId and ownerType for agency subscriptions', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.includes('/oauth/token')) {
        return new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (url.includes('/webhooks/v1/subscriptions') && init?.method === 'POST') {
        const body = JSON.parse(String(init.body))
        expect(body).toEqual({
          eventType: 'EnquiryCreated',
          eventCategory: 'lead',
          webhookUrl: 'https://example.com/hook',
          ownerId: 'ABCDEF',
          ownerType: 'agency',
        })
        return new Response(
          JSON.stringify({
            subscriptionId: 'sub-new',
            eventType: 'EnquiryCreated',
            eventCategory: 'lead',
            webhookUrl: 'https://example.com/hook',
            ownerId: 'ABCDEF',
            ownerType: 'agency',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      return new Response('not found', { status: 404 })
    })

    const client = new ReaClient({
      REA_CLIENT_ID: 'client-id',
      REA_CLIENT_SECRET: 'client-secret',
    })

    const result = await client.createLeadWebhookSubscription('https://example.com/hook', {
      ownerId: 'ABCDEF',
      ownerType: 'agency',
    })

    expect(result.subscriptionId).toBe('sub-new')
    expect(fetchMock).toHaveBeenCalled()
  })
})
