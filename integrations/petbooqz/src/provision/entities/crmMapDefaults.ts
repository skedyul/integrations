/**
 * Suggested CRM maps for Petbooqz entities. The workplace maps them in
 * Settings → CRM → Sources; Vetnostics and Zoetis use the same client and
 * patient models, matched on Petbooqz ID.
 */

import type { EntityCrmMapDefaults } from 'skedyul'

export const clientCrmMapDefaults: EntityCrmMapDefaults = {
  modelHandle: 'client',
  matchFieldHandle: 'petbooqz_id',
  matchRuleEntityPaths: ['petbooqz_id'],
  fieldHandles: {
    petbooqz_id: 'petbooqz_id',
    first_name: 'first_name',
    last_name: 'last_name',
    email: 'email',
    phone: 'phone',
  },
  relationshipHandles: {
    patients: 'patient',
  },
}

export const patientCrmMapDefaults: EntityCrmMapDefaults = {
  modelHandle: 'patient',
  matchFieldHandle: 'petbooqz_id',
  matchRuleEntityPaths: ['petbooqz_id'],
  fieldHandles: {
    petbooqz_id: 'petbooqz_id',
    name: 'name',
    species: 'species',
    breed: 'breed',
  },
  relationshipHandles: {
    client: 'clients',
  },
}
