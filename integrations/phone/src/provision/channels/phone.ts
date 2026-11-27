/**
 * Phone Channel
 *
 * SMS and voice communication via Twilio.
 */

import { defineChannel } from 'skedyul'
import { COMPLIANCE_ITEM, COMPLIANCE_SECTION } from '../../lib/channel_setup_handles'

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
              handle: COMPLIANCE_ITEM,
              title: 'Business registration',
              description: 'Business details, a registration extract and a proof of address.',
              fields: [
                { key: 'business_name', label: 'Business' },
                { key: 'business_id', label: 'Business ID', copy: true },
                { key: 'address', label: 'Address' },
              ],
              actions: {
                not_started: {
                  handle: 'submit',
                  label: 'Submit documents',
                  icon: 'FileText',
                  variant: 'default',
                  tool: 'submit_compliance_document',
                  form: complianceForm('Submit for review'),
                },
                rejected: {
                  handle: 'resubmit',
                  label: 'Fix and resubmit',
                  icon: 'FileText',
                  variant: 'default',
                  tool: 'submit_compliance_document',
                  form: complianceForm('Resubmit'),
                },
                in_review: {
                  handle: 'check',
                  label: 'Check status',
                  icon: 'RefreshCw',
                  tool: 'check_compliance_status',
                },
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
            description: 'Calls to this number ring the number you forward them to.',
            icon: 'PhoneIncoming',
            fields: [
              { kind: 'toggle', key: 'inbound_voice_enabled', label: 'Forward incoming calls' },
              {
                kind: 'text',
                key: 'forwarding_phone_number',
                label: 'Forward to',
                inputType: 'tel',
                placeholder: '+61 4XX XXX XXX',
              },
            ],
            showWhen: { forwarding_phone_number: { field: 'inbound_voice_enabled', equals: true } },
            submit: { handle: 'save', label: 'Save', tool: 'update_forwarding_number' },
          },
          {
            kind: 'form',
            handle: 'outgoing',
            title: 'Outgoing calls',
            description: 'Let your team call customers from this number.',
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

/** The compliance submission form (same inputs as `submit_compliance_document`). */
function complianceForm(submitLabel: string) {
  return {
    title: 'Business registration',
    description: 'Provide your business details, a commercial register extract and a separate proof of address.',
    submitLabel,
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
        help: "We'll send compliance updates here.",
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
      {
        kind: 'text' as const,
        key: 'address',
        label: 'Business address',
        placeholder: '123 Main St, Sydney NSW 2000',
        required: true,
      },
      {
        kind: 'file' as const,
        key: 'file',
        label: 'Business registration document',
        help: 'A commercial register excerpt.',
        accept: '.pdf,.jpg,.jpeg,.png',
        required: true,
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
        accept: '.pdf,.jpg,.jpeg,.png',
        required: true,
      },
    ],
  }
}
