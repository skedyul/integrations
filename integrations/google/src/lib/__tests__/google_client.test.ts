import { describe, expect, it } from '@jest/globals'
import { buildGoogleOAuthUrl } from '../google_client'
import { getDefaultOAuthScopes } from '../../services/scopes'

describe('buildGoogleOAuthUrl', () => {
  it('builds an OAuth URL with offline access and calendar scopes', () => {
    const url = buildGoogleOAuthUrl({
      config: {
        clientId: 'client-id',
        clientSecret: 'client-secret',
        redirectUri: 'https://api.example.com/api/callbacks/oauth/google/dev',
      },
      state: 'encoded-state',
      scopes: getDefaultOAuthScopes(),
    })

    const parsed = new URL(url)
    expect(parsed.hostname).toBe('accounts.google.com')
    expect(parsed.searchParams.get('client_id')).toBe('client-id')
    expect(parsed.searchParams.get('access_type')).toBe('offline')
    expect(parsed.searchParams.get('prompt')).toBe('consent')
    expect(parsed.searchParams.get('state')).toBe('encoded-state')
    expect(parsed.searchParams.get('scope')).toContain('calendar')
  })
})
