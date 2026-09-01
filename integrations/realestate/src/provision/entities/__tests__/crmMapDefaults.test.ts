import { describe, expect, it } from '@jest/globals'
import { REA_ENQUIRY_TYPE_OPTIONS } from '../../../lib/rea-enquiry-types'
import customer from '../customer'
import property from '../property'
import enquiry from '../enquiry'
import propertyOwnership from '../property-ownership'
import {
  customerCrmMapDefaults,
  propertyCrmMapDefaults,
  enquiryCrmMapDefaults,
  propertyOwnershipCrmMapDefaults,
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
    expect(enquiryCrmMapDefaults.fieldHandles.enquiry_type).toBe('enquiry_type')
    expect(
      enquiry.fields.find((field) => field.handle === 'enquiry_type')?.options,
    ).toEqual(REA_ENQUIRY_TYPE_OPTIONS)
  })

  it('suggests property ownership match on ownership_key with customer and property links', () => {
    expect(propertyOwnershipCrmMapDefaults.modelHandle).toBe('property_ownership')
    expect(propertyOwnershipCrmMapDefaults.matchFieldHandle).toBe('ownership_key')
    expect(propertyOwnershipCrmMapDefaults.relationshipHandles).toEqual({
      customer: 'customer',
      property: 'property',
    })
    expect(propertyOwnership.fields.map((field) => field.handle)).toEqual([
      'ownership_key',
      'role',
    ])
    expect(propertyOwnership.relationships?.map((rel) => rel.handle)).toEqual([
      'customer',
      'property',
    ])
  })
})
