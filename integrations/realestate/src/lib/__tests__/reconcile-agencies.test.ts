import { describe, expect, it } from '@jest/globals'
import { integrationHasLeadScope } from '../reconcile-agencies'
import { REA_REQUIRED_LEAD_SCOPE } from '../rea-types'

describe('integrationHasLeadScope', () => {
  it('returns true when lead scope is present', () => {
    expect(
      integrationHasLeadScope({
        integrationId: 'int-1',
        ownerId: 'ABCDEF',
        ownerType: 'agency',
        scopes: [REA_REQUIRED_LEAD_SCOPE, 'other:scope'],
      }),
    ).toBe(true)
  })

  it('returns false when lead scope is missing', () => {
    expect(
      integrationHasLeadScope({
        integrationId: 'int-1',
        ownerId: 'ABCDEF',
        ownerType: 'agency',
        scopes: ['campaign:listing-performance:read'],
      }),
    ).toBe(false)
  })
})
