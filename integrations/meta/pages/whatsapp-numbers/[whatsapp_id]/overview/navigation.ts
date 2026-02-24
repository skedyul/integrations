/**
 * Navigation config for WhatsApp number detail pages.
 */

import type { NavigationConfig } from 'skedyul'

const navigation: NavigationConfig = {
  sidebar: {
    sections: [
      {
        title: '{{ whatsapp_phone_number.phone }}',
        items: [
          {
            label: 'Overview',
            href: '/whatsapp-numbers/{{ path_params.whatsapp_id }}/overview',
            icon: 'MessageSquare',
          },
        ],
      },
    ],
  },
  breadcrumb: {
    items: [
      { label: 'WhatsApp Numbers', href: '/whatsapp-numbers' },
      { label: '{{ whatsapp_phone_number.phone }}' },
    ],
  },
}

export default navigation
