/**
 * Google person identity — unique by email. Workplaces map this to customer/client/contact.
 */

import { defineEntity } from 'skedyul'
import { userCrmMapDefaults } from './crmMapDefaults'

export default defineEntity({
  handle: 'user',
  label: 'User',
  labelPlural: 'Users',
  description:
    'Google Calendar person (attendee, organizer, or connected account). Map onto a workplace people model such as customer or client.',
  crmMapDefaults: userCrmMapDefaults,
  fields: [
    {
      handle: 'email',
      label: 'Email',
      type: 'string',
      isUnique: true,
      required: true,
    },
    { handle: 'display_name', label: 'Display Name', type: 'string' },
  ],
})
