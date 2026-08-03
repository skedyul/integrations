/**
 * Agency Model (Internal)
 *
 * REA agencies authorized via Ignite for this single workplace install.
 * Many agencies per install; EnquiryCreated events are routed by agency_id.
 */

import { defineModel } from 'skedyul'

export default defineModel({
  handle: 'agency',
  label: 'Agency',
  labelPlural: 'Agencies',
  labelTemplate: '{{ agency_id }}',
  description: 'realestate.com.au agencies authorized for this installation',
  scope: 'internal',
  page: '/agencies',
  fields: [
    {
      handle: 'agency_id',
      label: 'REA Agency ID',
      type: 'string',
      unique: true,
      requirement: 'required',
      owner: 'app',
      description: '6-letter REA agency code (ownerId)',
    },
    {
      handle: 'integration_id',
      label: 'REA Integration ID',
      type: 'string',
      owner: 'app',
      system: true,
      description: 'UUID from the REA Integrations API',
    },
    {
      handle: 'scopes',
      label: 'Scopes',
      type: 'long_string',
      owner: 'app',
      description: 'Comma-separated scopes granted by the agency',
    },
    {
      handle: 'has_lead_scope',
      label: 'Has Lead Scope',
      type: 'boolean',
      owner: 'app',
      default: false,
      description: 'Whether lead:enquiries:read is granted',
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
    {
      handle: 'connected_at',
      label: 'Connected At',
      type: 'datetime',
      owner: 'app',
    },
  ],
})
