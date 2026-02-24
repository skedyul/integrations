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

  requires: [
    {
      model: 'meta_connection',
      where: { status: { eq: 'connected' } },
    },
  ],

  fields: [
    {
      handle: 'page_id',
      label: 'Page ID',
      type: 'string',
      required: true,
      unique: true,
      system: true,
      description: 'Meta Graph API Page ID',
      owner: 'app',
    },
    {
      handle: 'name',
      label: 'Page Name',
      type: 'string',
      required: true,
      system: true,
      description: 'Name of the Facebook Page',
      owner: 'app',
    },
    {
      handle: 'access_token',
      label: 'Page Access Token',
      type: 'string',
      required: false,
      system: true,
      description: 'Page-specific access token for Messenger API',
      owner: 'app',
    },
    {
      handle: 'category',
      label: 'Category',
      type: 'string',
      required: false,
      system: true,
      description: 'Page category from Meta',
      owner: 'app',
    },
  ],
})
