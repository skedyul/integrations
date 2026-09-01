import { describe, expect, it } from '@jest/globals'
import customersPage from '../customers'
import propertiesPage from '../properties'
import enquiriesPage from '../enquiries'
import navigation from '../navigation'

type LooseField = {
  id?: string
  component?: string
  props?: { entity?: string }
}

function cardFields(page: { blocks?: Array<{ type?: string; form?: { fields?: LooseField[] } }> }) {
  return page.blocks?.flatMap((block) =>
    block.type === 'card' && block.form?.fields ? block.form.fields : [],
  )
}

describe('CRM entity pages', () => {
  it('exposes customers, properties, and enquiries in the install sidebar', () => {
    const hrefs = navigation.sidebar?.sections[0]?.items.map((item) => item.href)
    expect(hrefs).toEqual([
      '/setup',
      '/agencies',
      '/customers',
      '/properties',
      '/enquiries',
    ])
  })

  it('maps the customer entity on the customers page', () => {
    expect(customersPage.path).toBe('/customers')
    const fields = cardFields(customersPage)
    expect(
      fields?.find((field) => field.id === 'customer-crm-map-status')?.props
        ?.entity,
    ).toBe('customer')
    expect(
      fields?.some((field) => field.component === 'EventWiringPanel'),
    ).toBe(true)
  })

  it('maps property and property_ownership on the properties page', () => {
    expect(propertiesPage.path).toBe('/properties')
    const fields = cardFields(propertiesPage)
    expect(
      fields?.find((field) => field.id === 'property-crm-map-status')?.props
        ?.entity,
    ).toBe('property')
    expect(
      fields?.find((field) => field.id === 'property-ownership-crm-map-status')
        ?.props?.entity,
    ).toBe('property_ownership')
  })

  it('maps the enquiry entity on the enquiries page', () => {
    expect(enquiriesPage.path).toBe('/enquiries')
    const fields = cardFields(enquiriesPage)
    expect(
      fields?.find((field) => field.id === 'enquiry-crm-map-status')?.props
        ?.entity,
    ).toBe('enquiry')
  })
})
