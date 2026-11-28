/**
 * Phone Channel
 *
 * SMS and voice communication via Twilio.
 */

import { defineChannel } from 'skedyul'
import { COMPLIANCE_SECTION, COMPLIANCE_STEPS } from '../../lib/channel_setup_handles'

/** Step forms; each saves through its step's tool, with the same inputs. */
const businessForm = {
  title: 'Business details',
  description: 'As they appear on your business registration.',
  submitLabel: 'Save',
  fields: [
    { kind: 'text' as const, key: 'business_name', label: 'Business name', placeholder: 'ACME Pty Ltd', required: true },
    {
      kind: 'text' as const,
      key: 'business_id',
      label: 'Business ID number',
      placeholder: 'e.g. ABN, EIN',
      help: 'Your business registration or tax ID number.',
      required: true,
    },
    {
      kind: 'text' as const,
      key: 'business_email',
      label: 'Business email',
      inputType: 'email' as const,
      placeholder: 'compliance@yourcompany.com',
      help: "We'll send review updates here.",
      required: true,
    },
    {
      kind: 'select' as const,
      key: 'country',
      label: 'Country',
      default: 'AU',
      options: [{ value: 'AU', label: 'Australia' }],
      required: true,
    },
  ],
}

const addressForm = {
  title: 'Business address',
  submitLabel: 'Save',
  fields: [
    {
      kind: 'text' as const,
      key: 'address',
      label: 'Business address',
      placeholder: '123 Main St, Sydney NSW 2000',
      help: 'A street address. PO boxes are not accepted.',
      required: true,
    },
  ],
}

const documentsForm = {
  title: 'Supporting documents',
  description: 'PDF or image files.',
  submitLabel: 'Save',
  fields: [
    {
      kind: 'file' as const,
      key: 'file',
      label: 'Business registration document',
      help: 'A commercial register extract.',
      accept: '.pdf,.jpg,.jpeg,.png',
    },
    {
      kind: 'select' as const,
      key: 'address_proof_type',
      label: 'Proof of address type',
      options: [
        { value: 'utility_bill', label: 'Utility bill' },
        { value: 'tax_document', label: 'Tax notice' },
        { value: 'rental_receipt', label: 'Rent receipt' },
        { value: 'title_deed', label: 'Title deed' },
      ],
      required: true,
    },
    {
      kind: 'file' as const,
      key: 'address_proof',
      label: 'Proof of address',
      help: 'Dated in the last 3 months.',
      accept: '.pdf,.jpg,.jpeg,.png',
    },
  ],
}

export default defineChannel({
  handle: 'phone',
  label: 'Phone',
  icon: 'Phone',

  fields: [
    {
      handle: 'phone',
      label: 'Phone',
      identifier: true,
      definition: 'phone',
      visibility: {
        data: true,
        list: true,
        filters: true,
      },
    },
  ],

  capabilities: {
    messaging: {
      label: 'SMS',
      icon: 'MessageSquare',
      receive: 'receive_sms',
      send: 'send_sms',
      send_batch: {
        send: 'send_sms_batch',
        get_status: 'get_sms_bulk_status',
      },
    },
    voice: {
      label: 'Voice',
      icon: 'Phone',
      receive: 'receive_call',
      send: 'make_call',
    },
  },

  // Settings → Communication. Tools take `communicationChannelId` and report
  // their state through `channelSetup.*` (src/lib/channel_setup.ts).
  management: {
    noun: { one: 'number', many: 'numbers' },
    order: 1,
    // Reports compliance and every number from our models when the page opens.
    sync: { tool: 'sync_channel_setup' },
    archiveNote: 'The number stays in your Twilio account. Remove it from the Calls & number tab to release it.',
    features: [
      { key: 'sms', label: 'SMS', icon: 'MessageSquare' },
      { key: 'inbound', label: 'Incoming calls', icon: 'PhoneIncoming', attribute: 'inbound_voice_enabled' },
      { key: 'outbound', label: 'Outgoing calls', icon: 'PhoneOutgoing', attribute: 'outbound_voice_enabled' },
    ],
    setup: {
      description: 'Carriers need to know who is sending before you can buy a number.',
      sections: [
        {
          kind: 'requirements',
          handle: COMPLIANCE_SECTION,
          title: 'Regulatory compliance',
          description: 'Your business details and documents, reviewed by our carrier partner. Review usually takes 1 to 3 business days.',
          icon: 'ShieldCheck',
          unlocks: 'Buying phone numbers',
          items: [
            {
              handle: COMPLIANCE_STEPS.business,
              title: 'Business details',
              description: 'Your legal business name, business ID and an email for review updates.',
              fields: [
                { key: 'business_name', label: 'Business' },
                { key: 'business_id', label: 'Business ID', copy: true },
                { key: 'business_email', label: 'Email' },
              ],
              actions: {
                not_started: {
                  handle: 'add',
                  label: 'Add details',
                  variant: 'default',
                  tool: 'save_compliance_business',
                  form: businessForm,
                },
                approved: { handle: 'edit', label: 'Edit', variant: 'ghost', tool: 'save_compliance_business', form: businessForm },
              },
            },
            {
              handle: COMPLIANCE_STEPS.address,
              title: 'Business address',
              description: 'Where the business is registered. PO boxes are not accepted.',
              fields: [{ key: 'address', label: 'Address' }],
              actions: {
                not_started: { handle: 'add', label: 'Add address', variant: 'default', tool: 'save_compliance_address', form: addressForm },
                approved: { handle: 'edit', label: 'Edit', variant: 'ghost', tool: 'save_compliance_address', form: addressForm },
              },
            },
            {
              handle: COMPLIANCE_STEPS.documents,
              title: 'Supporting documents',
              description: 'A business registration extract, and a proof of address dated in the last 3 months.',
              actions: {
                not_started: {
                  handle: 'upload',
                  label: 'Upload documents',
                  icon: 'Upload',
                  variant: 'default',
                  tool: 'save_compliance_documents',
                  form: documentsForm,
                },
                approved: { handle: 'replace', label: 'Replace', variant: 'ghost', tool: 'save_compliance_documents', form: documentsForm },
              },
            },
            {
              handle: COMPLIANCE_STEPS.review,
              title: 'Carrier review',
              description: 'We send the steps above to our carrier partner. Review usually takes 1 to 3 business days.',
              actions: {
                not_started: {
                  handle: 'submit',
                  label: 'Submit for review',
                  icon: 'Send',
                  variant: 'default',
                  tool: 'submit_compliance_for_review',
                  confirm: {
                    title: 'Submit for review?',
                    body: "Your details and documents go to the carrier. You can't change them while they are reviewed.",
                    confirmLabel: 'Submit',
                  },
                },
                rejected: {
                  handle: 'resubmit',
                  label: 'Resubmit',
                  icon: 'Send',
                  variant: 'default',
                  tool: 'submit_compliance_for_review',
                  confirm: {
                    title: 'Resubmit for review?',
                    body: 'Fix the steps above first. Your updated details and documents go back to the carrier.',
                    confirmLabel: 'Resubmit',
                  },
                },
              },
            },
            {
              handle: COMPLIANCE_STEPS.verification,
              title: 'Check verification',
              description: "We hear from the carrier when the review is done. If an update doesn't reach us, check here.",
              actions: {
                not_started: { handle: 'check', label: 'Check now', icon: 'RefreshCw', tool: 'check_compliance_status' },
              },
            },
          ],
        },
      ],
    },
    tabs: [
      {
        handle: 'calls',
        label: 'Calls & number',
        icon: 'Phone',
        sections: [
          {
            kind: 'form',
            handle: 'incoming',
            title: 'Incoming calls',
            description: 'What happens when a customer calls this number.',
            icon: 'PhoneIncoming',
            fields: [
              { kind: 'toggle', key: 'inbound_voice_enabled', label: 'Answer incoming calls' },
              {
                kind: 'radio',
                key: 'inbound_call_route',
                label: 'Send calls to',
                default: 'forward',
                options: [
                  {
                    value: 'forward',
                    label: 'Another phone number',
                    description: 'Calls are forwarded to the number below.',
                  },
                  {
                    value: 'app',
                    label: 'The team, in the Skedyul app',
                    description:
                      'Rings every team member signed in to the Skedyul app. The first to answer takes the call.',
                  },
                ],
              },
              {
                kind: 'text',
                key: 'forwarding_phone_number',
                label: 'Forward to',
                help: 'When calls go to the app, this number is rung if nobody answers there within 20 seconds. Leave empty to have no fallback.',
                inputType: 'tel',
                placeholder: '+61 4XX XXX XXX',
              },
            ],
            showWhen: {
              inbound_call_route: { field: 'inbound_voice_enabled', equals: true },
              forwarding_phone_number: { field: 'inbound_voice_enabled', equals: true },
            },
            submit: { handle: 'save', label: 'Save', tool: 'update_forwarding_number' },
          },
          {
            kind: 'form',
            handle: 'outgoing',
            title: 'Outgoing calls',
            description:
              'Let your team call customers from this number. Turning this on shows a call button in this number\'s conversations in the Skedyul app.',
            icon: 'PhoneOutgoing',
            fields: [{ kind: 'toggle', key: 'outbound_voice_enabled', label: 'Allow outgoing calls' }],
            submit: { handle: 'save', label: 'Save', tool: 'update_outbound_voice' },
          },
          {
            kind: 'details',
            handle: 'number',
            title: 'Number',
            icon: 'Hash',
            items: [{ label: 'Phone number', key: 'phone' }],
            action: {
              handle: 'remove',
              label: 'Release number',
              icon: 'Trash2',
              variant: 'destructive',
              tool: 'remove_phone_number',
              confirm: {
                title: 'Release this number?',
                body: 'It is removed from your account and stops receiving messages and calls. Released numbers usually cannot be recovered.',
                confirmLabel: 'Release number',
              },
            },
          },
        ],
      },
    ],
    add: {
      title: 'Add a number',
      requires: {
        sections: [COMPLIANCE_SECTION],
        message: 'Your compliance documents need to be approved before you can buy a number.',
      },
      steps: [
        {
          handle: 'details',
          title: 'Name your number',
          description: 'We buy a local mobile number in your business country.',
          sections: [
            {
              kind: 'form',
              handle: 'number',
              title: 'Number',
              fields: [
                {
                  kind: 'text',
                  key: 'name',
                  label: 'Name',
                  placeholder: 'e.g. Front desk',
                  help: 'How the number appears across Skedyul.',
                },
              ],
            },
          ],
          next: { handle: 'buy', label: 'Buy number', tool: 'submit_new_phone_number' },
        },
      ],
      done: {
        title: 'Number added',
        body: 'Messages to it now arrive in Threads. Set up call forwarding on its Calls & number tab.',
      },
    },
  },
})
