/**
 * Clients Page
 *
 * Configure Client Model Mapping.
 *
 * Path: /clients
 */

import { definePage } from 'skedyul'

export default definePage({
  handle: 'clients',
  label: 'Clients',
  type: 'instance',
  path: '/clients',
  default: true,
  navigation: true,

  blocks: [
    {
      type: 'model_mapper',
      model: 'client',
    },
  ],
})
