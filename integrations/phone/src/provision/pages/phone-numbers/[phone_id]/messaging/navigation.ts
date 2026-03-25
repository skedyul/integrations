/**
 * Navigation config for phone number detail pages.
 */

import type { NavigationConfig } from 'skedyul'

const navigation: NavigationConfig = {
  sidebar: {
    sections: [
      {
        title: '{{ phone_number.phone }}',
        items: [
          { label: 'Overview', href: '/phone-numbers/{{ path_params.phone_id }}/overview', icon: 'Phone' },
          { label: 'Messaging', href: '/phone-numbers/{{ path_params.phone_id }}/messaging', icon: 'MessageSquare' },
          { label: 'Voice', href: '/phone-numbers/{{ path_params.phone_id }}/voice', icon: 'PhoneCall' },
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
}

export default navigation
