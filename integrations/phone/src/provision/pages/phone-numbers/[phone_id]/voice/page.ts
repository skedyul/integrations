/**
 * Phone Number Detail Page - Voice
 *
 * Path: /phone-numbers/[phone_id]/voice
 */

import { definePage } from 'skedyul'
import navigation from '../navigation'

const inboundEnabledChecked = [
  "{%- if phone_number.inbound_voice_enabled -%}true",
  "{%- elsif phone_number.forwarding_phone_number != blank -%}true",
  "{%- else -%}false",
  "{%- endif -%}",
].join('')

const inboundForwardingHidden = [
  "{%- if phone_number.inbound_voice_enabled -%}false",
  "{%- elsif phone_number.forwarding_phone_number != blank -%}false",
  "{%- else -%}true",
  "{%- endif -%}",
].join('')

const outboundEnabledChecked = [
  "{%- if phone_number.outbound_voice_enabled -%}true",
  "{%- else -%}false",
  "{%- endif -%}",
].join('')

export default definePage({
  handle: 'phone-number-voice',
  label: 'Voice',
  type: 'instance',
  path: '/phone-numbers/[phone_id]/voice',
  navigation,

  context: {
    phone_number: {
      model: 'phone_number',
      mode: 'first',
      filters: {
        id: { eq: '{{ path_params.phone_id }}' },
      },
    },
    compliance_record: {
      model: 'compliance_record',
      mode: 'first',
    },
  },

  blocks: [
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Inbound Voice',
        description: 'Receive calls on this number and forward them to another phone.',
      },
      form: {
        id: 'inbound-voice-form',
        fields: [
          {
            component: 'switch',
            id: 'inbound_voice_enabled',
            row: 0,
            col: 0,
            label: 'Enable inbound voice',
            helpText: 'When enabled, incoming calls to this number can be forwarded.',
            checked: inboundEnabledChecked,
          },
          {
            component: 'input',
            id: 'forwarding_phone_number',
            row: 1,
            col: 0,
            type: 'tel',
            label: 'Forwarding number',
            leftIcon: 'PhoneForwarded',
            value: '{{ phone_number.forwarding_phone_number }}',
            placeholder: '+61412345678',
            helpText: 'Calls to this phone number will be forwarded here.',
            hidden: inboundForwardingHidden,
            hiddenWhen: 'inbound_voice_enabled',
          },
        ],
        layout: {
          type: 'form',
          rows: [
            { columns: [{ field: 'inbound_voice_enabled', colSpan: 12 }] },
            { columns: [{ field: 'forwarding_phone_number', colSpan: 12 }] },
          ],
        },
        actions: [
          {
            handle: 'save_inbound_voice',
            label: 'Save',
            handler: 'update_forwarding_number',
            variant: 'primary',
          },
        ],
      },
    },
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Outbound Voice',
        description: 'Place outbound calls from this phone number.',
      },
      form: {
        id: 'outbound-voice-form',
        fields: [
          {
            component: 'switch',
            id: 'outbound_voice_enabled',
            row: 0,
            col: 0,
            label: 'Enable outbound voice',
            helpText: 'Outbound calling is not available yet.',
            checked: outboundEnabledChecked,
            handler: 'update_outbound_voice',
          },
        ],
        layout: {
          type: 'form',
          rows: [{ columns: [{ field: 'outbound_voice_enabled', colSpan: 12 }] }],
        },
      },
    },
  ],
})
