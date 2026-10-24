import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildMetaOAuthUrl } from '../meta_oauth.ts'

describe('buildMetaOAuthUrl', () => {
  it('re-requests permissions so a reinstall can grant WhatsApp again', () => {
    const url = new URL(
      buildMetaOAuthUrl({
        appId: 'app-id',
        graphApiVersion: 'v26.0',
        redirectUri: 'https://admin.skedyul.it/api/callbacks/oauth/meta/prod',
        state: 'encoded-state',
      }),
    )

    assert.equal(url.hostname, 'www.facebook.com')
    assert.equal(url.pathname, '/v26.0/dialog/oauth')
    assert.equal(url.searchParams.get('client_id'), 'app-id')
    assert.equal(url.searchParams.get('response_type'), 'code')
    assert.equal(url.searchParams.get('auth_type'), 'rerequest')
    assert.equal(url.searchParams.get('state'), 'encoded-state')
    assert.ok(url.searchParams.get('scope')?.includes('whatsapp_business_management'))
    assert.ok(url.searchParams.get('scope')?.includes('business_management'))
  })
})
