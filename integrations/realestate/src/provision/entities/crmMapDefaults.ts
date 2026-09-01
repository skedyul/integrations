/**
 * Suggested CRM map defaults for REA entities.
 * Consumed generically by core install UI via entity.crmMapDefaults.
 */

import type { EntityCrmMapDefaults } from 'skedyul'

export const customerCrmMapDefaults: EntityCrmMapDefaults = {
  modelHandle: 'customer',
  matchFieldHandle: 'phone',
  matchRuleEntityPaths: ['phone', 'email'],
  fieldHandles: {
    first_name: 'first_name',
    last_name: 'last_name',
    email: 'email',
    phone: 'phone',
    preferred_contact_method: 'preferred_contact_method',
  },
}

export const propertyCrmMapDefaults: EntityCrmMapDefaults = {
  modelHandle: 'property',
  matchFieldHandle: 'listing_id',
  matchRuleEntityPaths: ['listing_id', 'address'],
  fieldHandles: {
    listing_id: 'listing_id',
    address: 'address',
  },
}

export const enquiryCrmMapDefaults: EntityCrmMapDefaults = {
  modelHandle: 'enquiry',
  matchFieldHandle: 'rea_enquiry_id',
  matchRuleEntityPaths: ['rea_enquiry_id'],
  fieldHandles: {
    rea_enquiry_id: 'rea_enquiry_id',
    rea_agency_id: 'rea_agency_id',
    enquiry_type: 'enquiry_type',
    comments: 'comments',
    source: 'source',
    received_at: 'received_at',
    processed_at: 'processed_at',
    postcode: 'postcode',
    preferred_contact_method: 'preferred_contact_method',
  },
  relationshipHandles: {
    customer: 'customer',
    property: 'property',
  },
}

export const leadCrmMapDefaults: EntityCrmMapDefaults = {
  modelHandle: 'customer',
  matchFieldHandle: 'rea_enquiry_id',
  matchRuleEntityPaths: ['rea_enquiry_id', 'phone', 'email'],
  fieldHandles: {
    rea_enquiry_id: 'rea_enquiry_id',
    rea_agency_id: 'rea_agency_id',
    first_name: 'first_name',
    last_name: 'last_name',
    email: 'email',
    phone: 'phone',
    postcode: 'postcode',
    enquiry_type: 'enquiry_type',
    comments: 'comments',
    preferred_contact_method: 'preferred_contact_method',
    received_at: 'received_at',
    processed_at: 'processed_at',
    listing_id: 'listing_id',
    listing_address: 'listing_address',
    source: 'source',
  },
}
