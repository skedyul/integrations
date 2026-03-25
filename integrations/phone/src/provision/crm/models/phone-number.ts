/**
 * Phone Number Model
 *
 * Twilio phone numbers provisioned for the workplace.
 * Requires an APPROVED compliance record before provisioning.
 */

import { defineModel } from 'skedyul'

export default defineModel({
  handle: 'phone_number',
  label: 'Phone Number',
  labelPlural: 'Phone Numbers',
  labelTemplate: '{{ phone }}',
  description: 'Phone numbers for SMS/voice communication',
  scope: 'internal',

  requires: [
    {
      model: 'compliance_record',
      where: { status: { eq: 'approved' } },
    },
  ],

  fields: [
    {
      handle: 'phone',
      label: 'Phone Number',
      type: 'string',
      definition: 'phone',
      requirement: 'required',
      unique: true,
      system: false,
      description: 'The Phone number (E.164 format)',
      owner: 'app',
    },
    {
      handle: 'name',
      label: 'Name',
      type: 'string',
      requirement: 'optional',
      system: false,
      description: 'A friendly name for this phone number',
      owner: 'shared',
    },
    {
      handle: 'forwarding_phone_number',
      label: 'Forwarding Phone Number',
      type: 'string',
      definition: 'phone',
      requirement: 'optional',
      system: false,
      description: 'Phone number to forward incoming calls to',
      owner: 'shared',
    },
  ],
})
