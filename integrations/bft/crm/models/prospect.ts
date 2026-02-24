/**
 * Prospect Model (Shared)
 *
 * Sales cadence tracking for gym prospects.
 */

import { defineModel } from 'skedyul'

export default defineModel({
  handle: 'prospect',
  label: 'Prospect',
  labelPlural: 'Prospects',
  labelTemplate: '{{ stage }}',
  description: 'Sales cadence tracking for gym prospects',
  scope: 'shared',

  fields: [
    {
      handle: 'stage',
      label: 'Stage',
      type: 'string',
      required: true,
      system: false,
      description: 'Current stage in the sales cadence',
      owner: 'app',
      default: 'new_lead',
      constraints: {
        limitChoices: 1,
        options: [
          { label: 'New Lead', value: 'new_lead', color: 'blue' },
          { label: 'Contacted', value: 'contacted', color: 'yellow' },
          { label: 'Trial Booked', value: 'trial_booked', color: 'orange' },
          { label: 'Trial Completed', value: 'trial_completed', color: 'purple' },
          { label: 'Negotiation', value: 'negotiation', color: 'indigo' },
          { label: 'Won', value: 'won', color: 'green' },
          { label: 'Lost', value: 'lost', color: 'red' },
        ],
      },
    },
    {
      handle: 'source',
      label: 'Source',
      type: 'string',
      required: false,
      system: false,
      description: 'How the prospect found us',
      owner: 'app',
      constraints: {
        limitChoices: 1,
        options: [
          { label: 'Walk-in', value: 'walk_in' },
          { label: 'Website', value: 'website' },
          { label: 'Referral', value: 'referral' },
          { label: 'Social Media', value: 'social_media' },
          { label: 'Event', value: 'event' },
          { label: 'BFT App', value: 'bft_app' },
          { label: 'Other', value: 'other' },
        ],
      },
    },
    {
      handle: 'interest',
      label: 'Interest',
      type: 'string',
      required: false,
      system: false,
      description: 'What the prospect is interested in',
      owner: 'app',
      constraints: {
        limitChoices: 1,
        options: [
          { label: 'Membership', value: 'membership' },
          { label: 'Intro Offer', value: 'intro_offer' },
          { label: 'Class Pass', value: 'class_pass' },
          { label: 'Group Training', value: 'group_training' },
          { label: 'Personal Training', value: 'personal_training' },
          { label: 'Other', value: 'other' },
        ],
      },
    },
    {
      handle: 'follow_up_date',
      label: 'Follow Up Date',
      type: 'date',
      required: false,
      system: false,
      description: 'Next scheduled follow-up date',
      owner: 'app',
    },
    {
      handle: 'notes',
      label: 'Notes',
      type: 'long_string',
      required: false,
      system: false,
      description: 'Context about the conversation and prospect',
      owner: 'app',
    },
  ],
})
