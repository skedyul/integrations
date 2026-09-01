import { describe, expect, it } from '@jest/globals'
import customer from '../customer'
import property from '../property'
import enquiry from '../enquiry'
import lead from '../lead'
import {
  customerCrmMapDefaults,
  propertyCrmMapDefaults,
  enquiryCrmMapDefaults,
  leadCrmMapDefaults,
} from '../crmMapDefaults'

describe('crmMapDefaults', () => {
  it('suggests customer match on phone then email', () => {
    expect(customerCrmMapDefaults.modelHandle).toBe('customer')
    expect(customerCrmMapDefaults.matchFieldHandle).toBe('phone')
    expect(customerCrmMapDefaults.matchRuleEntityPaths).toEqual(['phone', 'email'])
    expect(customer.fields.map((field) => field.handle)).toEqual([
      'first_name',
      'last_name',
      'email',
      'phone',
      'preferred_contact_method',
    ])
  })

  it('suggests property match on listing_id', () => {
    expect(propertyCrmMapDefaults.modelHandle).toBe('property')
    expect(propertyCrmMapDefaults.matchFieldHandle).toBe('listing_id')
    expect(propertyCrmMapDefaults.fieldHandles.address).toBe('address')
  })

  it('suggests enquiry match on rea_enquiry_id with customer and property links', () => {
    expect(enquiryCrmMapDefaults.modelHandle).toBe('enquiry')
    expect(enquiryCrmMapDefaults.matchFieldHandle).toBe('rea_enquiry_id')
    expect(enquiryCrmMapDefaults.relationshipHandles).toEqual({
      customer: 'customer',
      property: 'property',
    })
    expect(enquiry.relationships?.map((rel) => rel.handle)).toEqual([
      'customer',
      'property',
    ])
  })

  it('keeps the legacy lead map for workplaces that still flatten onto one model', () => {
    expect(leadCrmMapDefaults.modelHandle).toBe('customer')
    expect(leadCrmMapDefaults.fieldHandles.listing_address).toBe('listing_address')
    expect(lead.fields.some((field) => field.handle === 'rea_enquiry_id')).toBe(
      true,
    )
  })
})
