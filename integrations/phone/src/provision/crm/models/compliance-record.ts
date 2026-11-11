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
      requirement: 'required',
      system: false,
      description: 'Legal name of the business',
      owner: 'shared',
    },
    {
      handle: 'business_email',
      label: 'Business Email',
      type: 'string',
      requirement: 'required',
      system: false,
      description: 'Email address for compliance notifications',
      owner: 'shared',
    },
    {
      handle: 'business_id',
      label: 'Business ID Number',
      type: 'string',
      requirement: 'required',
      system: false,
      description: 'Business registration or tax ID number',
      owner: 'shared',
    },
    {
      handle: 'country',
      label: 'Country',
      type: 'string',
      requirement: 'required',
      system: false,
      description: 'Country where the business is registered',
      owner: 'shared',
      definition: {
        limitChoices: 1,
        options: [{ label: 'Australia', value: 'AU' }],
      },
    },
    {
      handle: 'address',
      label: 'Business Address',
      type: 'string',
      requirement: 'required',
      system: false,
      description: 'Full business address (will be parsed automatically)',
      owner: 'shared',
    },
    {
      handle: 'file',
      label: 'Business Registration Document',
      type: 'file',
      requirement: 'required',
      system: false,
      description: 'Commercial register excerpt or equivalent government document',
      owner: 'shared',
    },
    {
      handle: 'address_proof_type',
      label: 'Proof of Address Type',
      type: 'string',
      requirement: 'optional',
      system: false,
      description: 'Kind of document uploaded as proof of address',
      owner: 'shared',
      definition: {
        limitChoices: 1,
        options: [
          { label: 'Utility bill', value: 'utility_bill' },
          { label: 'Tax notice', value: 'tax_document' },
          { label: 'Rent receipt', value: 'rental_receipt' },
          { label: 'Title deed', value: 'title_deed' },
        ],
      },
    },
    {
      handle: 'address_proof',
      label: 'Proof of Address',
      type: 'file',
      requirement: 'optional',
      system: false,
      description: 'Utility bill, tax notice, rent receipt, or title deed showing the business address',
      owner: 'shared',
    },

    // App-managed fields (app owner) - set by webhooks/tools
    {
      handle: 'status',
      label: 'Status',
      type: 'string',
      requirement: 'required',
      system: true,
      default: 'pending',
      description: 'Approval status of the compliance record',
      owner: 'app',
      definition: {
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
      requirement: 'optional',
      system: true,
      description: 'Twilio Regulatory Bundle SID',
      owner: 'app',
    },
    {
      handle: 'end_user_sid',
      label: 'End User SID',
      type: 'string',
      requirement: 'optional',
      system: true,
      description: 'Twilio End-User SID',
      owner: 'app',
    },
    {
      handle: 'document_sid',
      label: 'Document SID',
      type: 'string',
      requirement: 'optional',
      system: true,
      description: 'Twilio Supporting Document SID for the commercial register excerpt',
      owner: 'app',
    },
    {
      handle: 'address_document_sid',
      label: 'Address Document SID',
      type: 'string',
      requirement: 'optional',
      system: true,
      description: 'Twilio Supporting Document SID for the proof of address',
      owner: 'app',
    },
    {
      handle: 'address_sid',
      label: 'Address SID',
      type: 'string',
      requirement: 'optional',
      system: true,
      description: 'Twilio Address SID (required for AU phone number purchases)',
      owner: 'app',
    },
    {
      handle: 'rejection_reason',
      label: 'Rejection Reason',
      type: 'string',
      requirement: 'optional',
      system: true,
      description: 'Reason for rejection if compliance bundle was rejected',
      owner: 'app',
    },
  ],
})
