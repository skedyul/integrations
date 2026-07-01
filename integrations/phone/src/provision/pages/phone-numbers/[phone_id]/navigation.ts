/**
 * Shared navigation for phone number detail pages (overview, messaging, voice).
 */

import type { NavigationConfig } from 'skedyul'

const complianceApprovedHidden = [
  "{%- if compliance_record.status == 'approved' -%}false",
  "{%- else -%}true",
  "{%- endif -%}",
].join('')

const navigation = {
  sidebar: {
    sections: [
      {
        title: '{{ phone_number.phone }}',
        items: [
          {
            label: 'Overview',
            href: '/phone-numbers/{{ path_params.phone_id }}/overview',
            icon: 'Phone',
          },
          {
            label: 'Messaging',
            href: '/phone-numbers/{{ path_params.phone_id }}/messaging',
            icon: 'MessageSquare',
            hidden: complianceApprovedHidden,
          },
          {
            label: 'Voice',
            href: '/phone-numbers/{{ path_params.phone_id }}/voice',
            icon: 'PhoneCall',
            hidden: complianceApprovedHidden,
          },
        ],
      },
    ],
  },
  breadcrumb: {
    items: [
      { label: 'Phone Numbers', href: '/phone-numbers' },
      { label: '{{ phone_number.phone }}' },
    ],
  },
} as NavigationConfig

export default navigation
