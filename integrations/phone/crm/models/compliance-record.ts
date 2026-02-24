/**
 * Compliance Record Model
 *
 * Stores regulatory compliance information required by Twilio.
 * Must be APPROVED before phone numbers can be provisioned.
 */

import { defineModel } from 'skedyul'

export default defineModel({
  handle: 'compliance_record',
  label: 'Compliance Record',
  labelPlural: 'Compliance Records',
  labelTemplate: '{{ business_name }}',
  description: 'Regulatory compliance records for SMS/voice communication',
  scope: 'internal',

  fields: [
    // User-provided fields (workplace owner)
    {
      handle: 'business_name',
      label: 'Business Name',
      type: 'string',
      required: true,
      system: false,
      description: 'Legal name of the business',
      owner: 'workplace',
    },
    {
      handle: 'business_email',
      label: 'Business Email',
      type: 'string',
      required: true,
      system: false,
      description: 'Email address for compliance notifications',
      owner: 'workplace',
    },
    {
      handle: 'business_id',
      label: 'Business ID Number',
      type: 'string',
      required: true,
      system: false,
      description: 'Business registration or tax ID number',
      owner: 'workplace',
    },
    {
      handle: 'country',
      label: 'Country',
      type: 'string',
      required: true,
      system: false,
      description: 'Country where the business is registered',
      owner: 'workplace',
      constraints: {
        limitChoices: 1,
        options: [{ label: 'Australia', value: 'AU' }],
      },
    },
    {
      handle: 'address',
      label: 'Business Address',
      type: 'string',
      required: true,
      system: false,
      description: 'Full business address (will be parsed automatically)',
      owner: 'workplace',
    },
    {
      handle: 'file',
      label: 'Evidence of Business Registration & Address',
      type: 'file',
      required: true,
      system: false,
      description: 'Upload business registration documentation',
      owner: 'workplace',
    },

    // App-managed fields (app owner) - set by webhooks/tools
    {
      handle: 'status',
      label: 'Status',
      type: 'string',
      required: true,
      system: true,
      default: 'pending',
      description: 'Approval status of the compliance record',
      owner: 'app',
      constraints: {
        limitChoices: 1,
        options: [
          { label: 'Pending', value: 'pending', color: 'yellow' },
          { label: 'Submitted', value: 'submitted', color: 'blue' },
          { label: 'Pending Review', value: 'pending_review', color: 'orange' },
          { label: 'Approved', value: 'approved', color: 'green' },
          { label: 'Rejected', value: 'rejected', color: 'red' },
        ],
      },
    },
    {
      handle: 'bundle_sid',
      label: 'Bundle SID',
      type: 'string',
      required: false,
      system: true,
      description: 'Twilio Regulatory Bundle SID',
      owner: 'app',
    },
    {
      handle: 'end_user_sid',
      label: 'End User SID',
      type: 'string',
      required: false,
      system: true,
      description: 'Twilio End-User SID',
      owner: 'app',
    },
    {
      handle: 'document_sid',
      label: 'Document SID',
      type: 'string',
      required: false,
      system: true,
      description: 'Twilio Supporting Document SID',
      owner: 'app',
    },
    {
      handle: 'address_sid',
      label: 'Address SID',
      type: 'string',
      required: false,
      system: true,
      description: 'Twilio Address SID (required for AU phone number purchases)',
      owner: 'app',
    },
    {
      handle: 'rejection_reason',
      label: 'Rejection Reason',
      type: 'string',
      required: false,
      system: true,
      description: 'Reason for rejection if compliance bundle was rejected',
      owner: 'app',
    },
  ],
})
