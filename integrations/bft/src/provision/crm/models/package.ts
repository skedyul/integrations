/**
 * Package Model (Shared)
 *
 * Membership packages and intro offers from BFT.
 */

import { defineModel } from 'skedyul'

export default defineModel({
  handle: 'package',
  label: 'Package',
  labelPlural: 'Packages',
  labelTemplate: '{{ name }}',
  description: 'Membership packages and intro offers from BFT',
  scope: 'shared',

  fields: [
    {
      handle: 'name',
      label: 'Name',
      type: 'string',
      requirement: 'required',
      system: false,
      description: 'Package name',
      owner: 'app',
    },
    {
      handle: 'description',
      label: 'Description',
      type: 'long_string',
      requirement: 'optional',
      system: false,
      description: 'Package description',
      owner: 'app',
    },
    {
      handle: 'price',
      label: 'Price',
      type: 'string',
      requirement: 'optional',
      system: false,
      description: 'Price information',
      owner: 'app',
    },
    {
      handle: 'type',
      label: 'Type',
      type: 'string',
      requirement: 'required',
      system: false,
      description: 'Package type: "package" or "intro_offer"',
      owner: 'app',
    },
  ],
})
