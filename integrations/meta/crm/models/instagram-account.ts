/**
 * Instagram Account Model
 *
 * Individual Instagram Business accounts connected to the Meta account.
 * Used for Instagram Direct Messages.
 */

import { defineModel } from 'skedyul'

export default defineModel({
  handle: 'instagram_account',
  label: 'Instagram Account',
  labelPlural: 'Instagram Accounts',
  labelTemplate: '{{ username }}',
  description: 'Connected Instagram Business accounts for Direct Messages',
  scope: 'internal',

  requires: [
    {
      model: 'meta_connection',
      where: { status: { eq: 'connected' } },
    },
  ],

  fields: [
    {
      handle: 'instagram_account_id',
      label: 'Instagram Account ID',
      type: 'string',
      requirement: 'required',
      unique: true,
      system: true,
      description: 'Meta Graph API Instagram Business Account ID',
      owner: 'app',
    },
    {
      handle: 'username',
      label: 'Username',
      type: 'string',
      requirement: 'required',
      system: true,
      description: 'Instagram username',
      owner: 'app',
    },
    {
      handle: 'name',
      label: 'Account Name',
      type: 'string',
      requirement: 'optional',
      system: true,
      description: 'Display name of the Instagram account',
      owner: 'app',
    },
    {
      handle: 'profile_picture_url',
      label: 'Profile Picture URL',
      type: 'string',
      requirement: 'optional',
      system: true,
      description: 'URL to the profile picture',
      owner: 'app',
    },
  ],
})
