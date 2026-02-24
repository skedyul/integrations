/**
 * Environment Variables
 *
 * Install-level environment variables for the BFT app.
 */

import { defineEnv } from 'skedyul'

export default defineEnv({
  BFT_URL: {
    label: 'BFT Club URL',
    scope: 'install',
    required: true,
    visibility: 'visible',
    placeholder: 'https://www.bodyfittraining.au/club/braybrook',
    description: 'Full URL to the BFT club page (e.g., https://www.bodyfittraining.au/club/braybrook)',
  },
})
