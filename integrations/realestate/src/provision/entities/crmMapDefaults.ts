/**
 * Suggested CRM map defaults for REA entities (Lead + Enquiry).
 * Consumed generically by core install UI via entity.crmMapDefaults.
 */

import type { EntityCrmMapDefaults } from 'skedyul'

export const leadCrmMapDefaults: EntityCrmMapDefaults = {
  modelHandle: 'lead',
  matchRuleEntityPaths: ['email', 'phone'],
  fieldHandles: {
    first_name: 'first_name',
    last_name: 'last_name',
    email: 'email',
    phone: 'phone',
    postcode: 'postcode',
    preferred_contact_method: 'preferred_contact_method',
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
    received_at: 'received_at',
    processed_at: 'processed_at',
    listing_id: 'listing_id',
    listing_address: 'listing_address',
    source: 'source',
  },
  relationshipHandles: {
    lead: 'lead',
  },
}
