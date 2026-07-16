/**
 * Facebook Page Detail Page
 *
 * Path: /facebook-pages/[id]/overview
 */

import { definePage } from 'skedyul'
import navigation from './navigation'

export default definePage({
  handle: 'facebook-page-overview',
  label: 'Facebook Page',
  type: 'instance',
  path: '/facebook-pages/[facebook_page_id]/overview',
  navigation,

  context: {
    facebook_page: {
      model: 'facebook_page',
      mode: 'first',
      filters: {
        id: { eq: '{{ path_params.facebook_page_id }}' },
      },
    },
  },

  blocks: [
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Facebook Page Details',
        description: 'View this connected Facebook Page.',
      },
      form: {
        id: 'facebook-page-detail-form',
        fields: [
          {
            component: 'input',
            id: 'name',
            row: 0,
            col: 0,
            label: 'Page Name',
            leftIcon: 'MessageCircle',
            value: '{{ facebook_page.name }}',
            disabled: true,
          },
          {
            component: 'input',
            id: 'page_id',
            row: 1,
            col: 0,
            label: 'Page ID',
            value: '{{ facebook_page.page_id }}',
            disabled: true,
          },
          {
            component: 'input',
            id: 'category',
            row: 2,
            col: 0,
            label: 'Category',
            value: '{{ facebook_page.category }}',
            disabled: true,
          },
        ],
        layout: {
          type: 'form',
          rows: [
            { columns: [{ field: 'name', colSpan: 12 }] },
            { columns: [{ field: 'page_id', colSpan: 12 }] },
            { columns: [{ field: 'category', colSpan: 12 }] },
          ],
        },
      },
    },
  ],
})
