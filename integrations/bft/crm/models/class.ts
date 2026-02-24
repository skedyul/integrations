/**
 * Class Model (Shared)
 *
 * Class types and descriptions from BFT.
 */

import { defineModel } from 'skedyul'

export default defineModel({
  handle: 'class',
  label: 'Class',
  labelPlural: 'Classes',
  labelTemplate: '{{ name }}',
  description: 'Class types and descriptions from BFT',
  scope: 'shared',

  fields: [
    {
      handle: 'name',
      label: 'Name',
      type: 'string',
      required: true,
      system: false,
      description: 'Class name',
      owner: 'app',
    },
    {
      handle: 'description',
      label: 'Description',
      type: 'long_string',
      required: false,
      system: false,
      description: 'Class description',
      owner: 'app',
    },
    {
      handle: 'duration',
      label: 'Duration',
      type: 'string',
      required: false,
      system: false,
      description: 'Class duration',
      owner: 'app',
    },
    {
      handle: 'category',
      label: 'Category',
      type: 'string',
      required: false,
      system: false,
      description: 'Class category',
      owner: 'app',
    },
  ],
})
