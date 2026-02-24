/**
 * Provision Configuration
 *
 * Aggregates all modular config files into a single provision config.
 * This file is imported by skedyul.config.ts.
 */

import type { ProvisionConfig } from 'skedyul'

import env from './env'
import navigation from './navigation'
import * as models from './models'
import * as channels from './channels'
import * as pages from './pages'
import * as workflows from './workflows'

const config: ProvisionConfig = {
  env,
  navigation,
  models: Object.values(models),
  channels: Object.values(channels),
  pages: Object.values(pages),
  workflows: Object.values(workflows),

  relationships: [
    {
      source: {
        model: 'phone_number',
        field: 'compliance_record',
        label: 'Compliance Record',
        cardinality: 'many-to-one',
        onDelete: 'restrict',
      },
      target: {
        model: 'compliance_record',
        field: 'phone_numbers',
        label: 'Phone Numbers',
        cardinality: 'one-to-many',
        onDelete: 'none',
      },
    },
  ],
}

export default config
