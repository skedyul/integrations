/**
 * Prospects Page
 *
 * Model mapper for prospects.
 *
 * Path: /prospects
 */

import { definePage } from 'skedyul'

export default definePage({
  handle: 'prospects',
  label: 'Prospects',
  type: 'instance',
  path: '/prospects',
  navigation: true,

  blocks: [
    {
      type: 'model_mapper',
      model: 'prospect',
    },
  ],
})
