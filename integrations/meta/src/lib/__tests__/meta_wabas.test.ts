import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  GraphPermissionError,
  grantedWabaIdsFromDebugToken,
  lookupWhatsAppBusinessAccounts,
  type ReadGraph,
} from '../meta_wabas.ts'

const BASE = 'https://graph.facebook.com/v26.0'

function pages(routes: Record<string, unknown>): ReadGraph {
  return async (url) => {
    const parsed = new URL(url)
    const after = parsed.searchParams.get('after')
    const key = after ? `${parsed.pathname}?after=${after}` : parsed.pathname
    const body = routes[key]
    if (body instanceof Error) throw body
    if (body === undefined) {
      throw new Error(`Unexpected Graph URL ${key}`)
    }
    return body
  }
}

describe('grantedWabaIdsFromDebugToken', () => {
  it('lists the newest WhatsApp management grant first', () => {
    const ids = grantedWabaIdsFromDebugToken({
      data: {
        granular_scopes: [
          {
            scope: 'whatsapp_business_messaging',
            target_ids: ['messaging-only'],
          },
          {
            scope: 'whatsapp_business_management',
            target_ids: ['newest', 'older'],
          },
        ],
      },
    })
    assert.deepEqual(ids, ['newest', 'older', 'messaging-only'])
  })
})

describe('lookupWhatsAppBusinessAccounts', () => {
  it('uses a later business when the first owned list is empty', async () => {
    const readGraph = pages({
      '/v26.0/debug_token': { data: { granular_scopes: [] } },
      '/v26.0/me/businesses': {
        data: [
          { id: 'biz-empty', name: 'Empty' },
          { id: 'biz-waba', name: 'Club' },
        ],
      },
      '/v26.0/biz-empty/owned_whatsapp_business_accounts': { data: [] },
      '/v26.0/biz-empty/client_whatsapp_business_accounts': { data: [] },
      '/v26.0/biz-waba/owned_whatsapp_business_accounts': {
        data: [{ id: 'waba-1', name: 'Club WhatsApp', timezone_id: '1' }],
      },
      '/v26.0/biz-waba/client_whatsapp_business_accounts': { data: [] },
    })

    const wabas = await lookupWhatsAppBusinessAccounts({
      baseUrl: BASE,
      accessToken: 'user-token',
      appAccessToken: 'app|secret',
      readGraph,
    })

    assert.deepEqual(wabas, [
      { id: 'waba-1', name: 'Club WhatsApp', timezone_id: '1' },
    ])
  })

  it('includes a WhatsApp account shared with the business', async () => {
    const readGraph = pages({
      '/v26.0/debug_token': { data: {} },
      '/v26.0/me/businesses': { data: [{ id: 'biz-1', name: 'Portfolio' }] },
      '/v26.0/biz-1/owned_whatsapp_business_accounts': { data: [] },
      '/v26.0/biz-1/client_whatsapp_business_accounts': {
        data: [{ id: 'shared-waba', name: 'Shared', timezone_id: '5' }],
      },
    })

    const wabas = await lookupWhatsAppBusinessAccounts({
      baseUrl: BASE,
      accessToken: 'user-token',
      appAccessToken: 'app|secret',
      readGraph,
    })

    assert.equal(wabas[0]?.id, 'shared-waba')
    assert.equal(wabas[0]?.name, 'Shared')
  })

  it('keeps the account granted on reinstall when owned lists are empty', async () => {
    const calls: string[] = []
    const readGraph: ReadGraph = async (url) => {
      const parsed = new URL(url)
      calls.push(parsed.pathname)
      if (parsed.pathname.endsWith('/debug_token')) {
        return {
          data: {
            granular_scopes: [
              {
                scope: 'whatsapp_business_management',
                target_ids: ['granted-waba'],
              },
            ],
          },
        }
      }
      if (parsed.pathname.endsWith('/me/businesses')) {
        return { data: [{ id: 'biz-empty', name: 'Empty' }] }
      }
      if (parsed.pathname.includes('whatsapp_business_accounts')) {
        return { data: [] }
      }
      if (parsed.pathname.endsWith('/granted-waba')) {
        return { id: 'granted-waba', name: 'Reconnected', timezone_id: '2' }
      }
      throw new Error(`Unexpected Graph URL ${parsed.pathname}`)
    }

    const wabas = await lookupWhatsAppBusinessAccounts({
      baseUrl: BASE,
      accessToken: 'user-token',
      appAccessToken: 'app|secret',
      readGraph,
    })

    assert.deepEqual(wabas, [
      { id: 'granted-waba', name: 'Reconnected', timezone_id: '2' },
    ])
    assert.ok(calls.includes('/v26.0/debug_token'))
  })

  it('prefers the granted account over a different owned account', async () => {
    const readGraph = pages({
      '/v26.0/debug_token': {
        data: {
          granular_scopes: [
            {
              scope: 'whatsapp_business_management',
              target_ids: ['granted-waba'],
            },
          ],
        },
      },
      '/v26.0/me/businesses': { data: [{ id: 'biz-1', name: 'Portfolio' }] },
      '/v26.0/biz-1/owned_whatsapp_business_accounts': {
        data: [{ id: 'other-waba', name: 'Other', timezone_id: '1' }],
      },
      '/v26.0/biz-1/client_whatsapp_business_accounts': { data: [] },
      '/v26.0/granted-waba': {
        id: 'granted-waba',
        name: 'Just granted',
        timezone_id: '3',
      },
    })

    const wabas = await lookupWhatsAppBusinessAccounts({
      baseUrl: BASE,
      accessToken: 'user-token',
      appAccessToken: 'app|secret',
      readGraph,
    })

    assert.deepEqual(
      wabas.map((waba) => waba.id),
      ['granted-waba', 'other-waba'],
    )
    assert.equal(wabas[0]?.name, 'Just granted')
  })

  it('follows business pagination', async () => {
    const readGraph: ReadGraph = async (url) => {
      const parsed = new URL(url)
      if (parsed.pathname.endsWith('/debug_token')) return { data: {} }
      if (parsed.pathname.endsWith('/me/businesses') && !parsed.searchParams.get('after')) {
        return {
          data: [{ id: 'biz-1', name: 'First' }],
          paging: { next: `${BASE}/me/businesses?after=cursor-2&access_token=user-token` },
        }
      }
      if (parsed.pathname.endsWith('/me/businesses')) {
        return { data: [{ id: 'biz-2', name: 'Second' }] }
      }
      if (parsed.pathname.includes('biz-2/owned')) {
        return { data: [{ id: 'waba-2', name: 'Second WA', timezone_id: '1' }] }
      }
      if (parsed.pathname.includes('whatsapp_business_accounts')) return { data: [] }
      throw new Error(`Unexpected Graph URL ${parsed.pathname}`)
    }

    const wabas = await lookupWhatsAppBusinessAccounts({
      baseUrl: BASE,
      accessToken: 'user-token',
      appAccessToken: 'app|secret',
      readGraph,
    })

    assert.equal(wabas[0]?.id, 'waba-2')
  })

  it('skips a permission error on one edge and keeps looking', async () => {
    const readGraph: ReadGraph = async (url) => {
      const parsed = new URL(url)
      if (parsed.pathname.endsWith('/debug_token')) return { data: {} }
      if (parsed.pathname.endsWith('/me/businesses')) {
        return { data: [{ id: 'biz-1', name: 'Portfolio' }] }
      }
      if (parsed.pathname.endsWith('/owned_whatsapp_business_accounts')) {
        throw new GraphPermissionError('(#200) Requires whatsapp_business_management')
      }
      if (parsed.pathname.endsWith('/client_whatsapp_business_accounts')) {
        return { data: [{ id: 'shared-waba', name: 'Shared', timezone_id: '1' }] }
      }
      throw new Error(`Unexpected Graph URL ${parsed.pathname}`)
    }

    const wabas = await lookupWhatsAppBusinessAccounts({
      baseUrl: BASE,
      accessToken: 'user-token',
      appAccessToken: 'app|secret',
      readGraph,
    })

    assert.equal(wabas[0]?.id, 'shared-waba')
  })

  it('drops a granted id that can no longer be read when another account exists', async () => {
    const readGraph: ReadGraph = async (url) => {
      const parsed = new URL(url)
      if (parsed.pathname.endsWith('/debug_token')) {
        return {
          data: {
            granular_scopes: [
              {
                scope: 'whatsapp_business_management',
                target_ids: ['stale-grant'],
              },
            ],
          },
        }
      }
      if (parsed.pathname.endsWith('/me/businesses')) {
        return { data: [{ id: 'biz-1', name: 'Portfolio' }] }
      }
      if (parsed.pathname.endsWith('/owned_whatsapp_business_accounts')) {
        return { data: [{ id: 'live-waba', name: 'Live', timezone_id: '1' }] }
      }
      if (parsed.pathname.endsWith('/client_whatsapp_business_accounts')) {
        return { data: [] }
      }
      if (parsed.pathname.endsWith('/stale-grant')) {
        throw new GraphPermissionError('(#100) Unsupported get request')
      }
      throw new Error(`Unexpected Graph URL ${parsed.pathname}`)
    }

    const wabas = await lookupWhatsAppBusinessAccounts({
      baseUrl: BASE,
      accessToken: 'user-token',
      appAccessToken: 'app|secret',
      readGraph,
    })

    assert.deepEqual(
      wabas.map((waba) => waba.id),
      ['live-waba'],
    )
  })

  it('throws when the login has no business and no WhatsApp grant', async () => {
    const readGraph = pages({
      '/v26.0/debug_token': { data: { granular_scopes: [] } },
      '/v26.0/me/businesses': { data: [] },
    })

    await assert.rejects(
      () =>
        lookupWhatsAppBusinessAccounts({
          baseUrl: BASE,
          accessToken: 'user-token',
          appAccessToken: 'app|secret',
          readGraph,
        }),
      /No businesses found/,
    )
  })
})
