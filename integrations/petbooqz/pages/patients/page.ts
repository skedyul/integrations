/**
 * Patients Page
 *
 * Configure Patient Model Mapping.
 *
 * Path: /patients
 */

import { definePage } from 'skedyul'

export default definePage({
  handle: 'patients',
  label: 'Patients',
  type: 'instance',
  path: '/patients',
  navigation: true,

  blocks: [
    {
      type: 'model_mapper',
      model: 'patient',
    },
  ],
})
