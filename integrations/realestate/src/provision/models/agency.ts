/**
 * Agency Model (Internal)
 *
 * Links a workplace installation to a REA agency for webhook routing.
 */

import { defineModel } from 'skedyul'

export default defineModel({
  handle: 'agency',
  label: 'Agency',
  labelPlural: 'Agencies',
  labelTemplate: '{{ agency_id }}',
  scope: 'internal',
  fields: [
    {
      handle: 'agency_id',
      label: 'REA Agency ID',
      type: 'string',
      requirement: 'required',
      unique: true,
      description: 'REA agency identifier (6 uppercase letters)',
    },
    {
      handle: 'integration_id',
      label: 'REA Integration ID',
      type: 'string',
      requirement: 'required',
      system: true,
      description: 'Integration ID from REA Integrations API',
    },
    {
      handle: 'status',
      label: 'Status',
      type: 'string',
      owner: 'app',
      definition: {
        options: [
          { value: 'ACTIVE', label: 'Active', color: 'green' },
          { value: 'REVOKED', label: 'Revoked', color: 'red' },
        ],
      },
      default: 'ACTIVE',
    },
  ],
})
