import { describe, expect, it } from '@jest/globals'
import navigation from '../navigation'
import setup from '../../setup'

describe('install navigation', () => {
  it('lists only setup and agencies; CRM mapping lives in Settings → CRM → Sources', () => {
    const hrefs = navigation.sidebar?.sections[0]?.items.map((item) => item.href)
    expect(hrefs).toEqual(['/setup', '/agencies'])
  })

  it('keeps the CRM setup step that CRM Sources completes', () => {
    const crm = setup.find((step) => step.handle === 'setup_crm')
    expect(crm?.kind).toBe('crm')
    expect(crm?.entities).toEqual([
      'customer',
      'property',
      'enquiry',
      'property_ownership',
    ])
    expect(crm).not.toHaveProperty('href')
  })
})
