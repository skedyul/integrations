/**
 * Calendar event attendee — one row per event × email, with RSVP.
 * Relates to calendar_event and user so people models are not duplicated per event.
 */

import { defineEntity } from 'skedyul'
import { attendeeCrmMapDefaults } from './crmMapDefaults'

export default defineEntity({
  handle: 'attendee',
  label: 'Attendee',
  labelPlural: 'Attendees',
  description:
    'Google Calendar event invitation (RSVP). Relates to the event and the user (person) identity.',
  crmMapDefaults: attendeeCrmMapDefaults,
  fields: [
    {
      handle: 'event_attendee_key',
      label: 'Event Attendee Key',
      type: 'string',
      isUnique: true,
      required: true,
    },
    { handle: 'email', label: 'Email', type: 'string', required: true },
    { handle: 'display_name', label: 'Display Name', type: 'string' },
    {
      handle: 'response_status',
      label: 'Response',
      type: 'string',
      options: [
        { value: 'needsAction', label: 'Needs action' },
        { value: 'declined', label: 'Declined' },
        { value: 'tentative', label: 'Tentative' },
        { value: 'accepted', label: 'Accepted' },
      ],
    },
    { handle: 'organizer', label: 'Organizer', type: 'boolean' },
    { handle: 'optional', label: 'Optional', type: 'boolean' },
    { handle: 'self', label: 'Self', type: 'boolean' },
  ],
  relationships: [
    {
      handle: 'event',
      label: 'Event',
      targetEntity: 'calendar_event',
    },
    {
      handle: 'user',
      label: 'User',
      targetEntity: 'user',
    },
  ],
})
