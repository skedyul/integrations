/**
 * Compliance Page
 *
 * Single-instance page for submitting compliance documents.
 * This is the default landing page for the app installation.
 *
 * Path: /compliance
 */

import { definePage } from 'skedyul'

export default definePage({
  handle: 'compliance',
  label: 'Compliance',
  type: 'instance',
  path: '/compliance',
  default: true,
  navigation: true,

  context: {
    compliance_record: {
      model: 'compliance_record',
      mode: 'first',
    },
  },

  blocks: [
    {
      type: 'card',
      restructurable: false,
      form: {
        id: 'compliance-form',
        fields: [
          {
            component: 'fieldsetting',
            id: 'compliance_form',
            row: 0,
            col: 0,
            label: [
              "{%- if compliance_record.bundle_sid != blank -%}",
              "Submission: {{ compliance_record.bundle_sid | truncate: 16, '...' }}",
              "{%- else -%}",
              "Submit Compliance Documents",
              "{%- endif -%}",
            ].join(''),
            description: [
              "{%- if compliance_record == blank -%}",
              "Click to submit your business registration documents for compliance verification",
              "{%- elsif compliance_record.status == 'rejected' -%}",
              "Rejected: {{ compliance_record.reject_reason | default: 'No reason provided' }}",
              "{%- elsif compliance_record.status == 'pending' -%}",
              "Your compliance documents are pending submission",
              "{%- elsif compliance_record.status == 'submitted' -%}",
              "Your documents have been submitted and are awaiting review",
              "{%- elsif compliance_record.status == 'pending_review' -%}",
              "Your documents are currently under review",
              "{%- elsif compliance_record.status == 'approved' -%}",
              "Your compliance documents have been approved",
              "{%- else -%}",
              "Click to submit your business registration documents for compliance verification",
              "{%- endif -%}",
            ].join(''),
            mode: 'field',
            button: {
              label: [
                "{%- if compliance_record == blank -%}Submit Documents",
                "{%- elsif compliance_record.status == 'pending' -%}Submit Documents",
                "{%- elsif compliance_record.status == 'submitted' -%}Pending Review",
                "{%- elsif compliance_record.status == 'pending_review' -%}Under Review",
                "{%- elsif compliance_record.status == 'approved' -%}Approved",
                "{%- elsif compliance_record.status == 'rejected' -%}Resubmit",
                "{%- else -%}Submit Documents",
                "{%- endif -%}",
              ].join(''),
              variant: 'outline',
              size: 'sm',
              leftIcon: [
                "{%- if compliance_record == blank -%}FileText",
                "{%- elsif compliance_record.status == 'pending' -%}FileText",
                "{%- elsif compliance_record.status == 'submitted' -%}Clock",
                "{%- elsif compliance_record.status == 'pending_review' -%}Clock",
                "{%- elsif compliance_record.status == 'approved' -%}Check",
                "{%- elsif compliance_record.status == 'rejected' -%}X",
                "{%- else -%}FileText",
                "{%- endif -%}",
              ].join(''),
            },
            modalForm: {
              header: {
                title: 'Business Registration',
                description: 'Provide your business details and upload supporting documents for regulatory compliance.',
              },
              handler: 'submit_compliance_document',
              fields: [
                {
                  component: 'input',
                  id: 'business_name',
                  row: 0,
                  col: 0,
                  label: 'Business Name',
                  placeholder: 'ACME Pty Ltd',
                  helpText: 'The Legal name of your business.',
                  required: true,
                },
                {
                  component: 'input',
                  id: 'business_id',
                  row: 0,
                  col: 1,
                  label: 'Business ID Number',
                  placeholder: 'Tax ID (e.g., EIN, ABN)',
                  helpText: 'The Business ID number is used to verify your business.',
                  required: true,
                },
                {
                  component: 'input',
                  id: 'business_email',
                  row: 1,
                  col: 0,
                  label: 'Business Email',
                  helpText: "The Email address we'll notify you of the compliance status.",
                  placeholder: 'Email address for compliance notifications',
                  type: 'email',
                  required: true,
                },
                {
                  component: 'select',
                  id: 'country',
                  row: 2,
                  col: 0,
                  label: 'Country',
                  placeholder: 'Select country',
                  helpText: 'The Country where your business is registered.',
                  items: [{ label: 'Australia', value: 'AU' }],
                },
                {
                  component: 'input',
                  id: 'address',
                  row: 2,
                  col: 1,
                  label: 'Business Address',
                  placeholder: 'Full address (e.g., 123 Main St, Sydney)',
                  helpText: 'The Full business address (will be parsed automatically).',
                  required: true,
                },
                {
                  component: 'filesetting',
                  id: 'file',
                  row: 3,
                  col: 0,
                  label: 'Business Registration Document',
                  description: 'Upload your commercial register excerpt or equivalent (PDF, JPG, or PNG)',
                  accept: '.pdf,.jpg,.jpeg,.png',
                  required: true,
                  button: {
                    label: 'Upload Document',
                    variant: 'outline',
                    size: 'sm',
                  },
                },
              ],
              layout: {
                type: 'form',
                rows: [
                  { columns: [{ field: 'business_name', colSpan: 6 }, { field: 'business_id', colSpan: 6 }] },
                  { columns: [{ field: 'business_email', colSpan: 12 }] },
                  { columns: [{ field: 'country', colSpan: 6 }, { field: 'address', colSpan: 6 }] },
                  { columns: [{ field: 'file', colSpan: 12 }] },
                ],
              },
              actions: [
                {
                  handle: 'submit',
                  label: [
                    "{%- if compliance_record == blank -%}Submit",
                    "{%- else -%}Resubmit",
                    "{%- endif -%}",
                  ].join(''),
                  handler: 'submit_compliance_document',
                  icon: 'Send',
                  variant: 'primary',
                },
              ],
            },
          },
        ],
        layout: {
          type: 'form',
          rows: [{ columns: [{ field: 'compliance_form', colSpan: 12 }] }],
        },
      },
    },
  ],

  actions: [],
})
