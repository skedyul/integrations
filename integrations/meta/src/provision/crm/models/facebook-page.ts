/**
 * Facebook Page Model
 *
 * Individual Facebook Pages connected to the Meta account.
 * Used for Messenger communication.
 */

import { defineModel } from 'skedyul'

export default defineModel({
  handle: 'facebook_page',
  label: 'Facebook Page',
  labelPlural: 'Facebook Pages',
  labelTemplate: '{{ name }}',
  description: 'Connected Facebook Pages for Messenger',
  scope: 'internal',

  fields: [
    {
      handle: 'page_id',
      label: 'Page ID',
      type: 'string',
      requirement: 'required',
      unique: true,
      system: true,
      description: 'Meta Graph API Page ID',
      owner: 'app',
    },
    {
      handle: 'name',
      label: 'Page Name',
      type: 'string',
      requirement: 'required',
      system: true,
      description: 'Name of the Facebook Page',
      owner: 'app',
    },
    {
      handle: 'category',
      label: 'Category',
      type: 'string',
      requirement: 'optional',
      system: true,
      description: 'Page category from Meta',
      owner: 'app',
    },
  ],

  env: {
    ACCESS_TOKEN: {
      label: 'Page Access Token',
      visibility: 'encrypted',
      description: 'Page-specific access token for Messenger API',
    },
  },
})
