/**
 * Provision Configuration
 *
 * Aggregates all modular config files for the BFT app.
 */

import type { ProvisionConfig } from 'skedyul'

import env from './env'
import { models, relationships } from './crm'
import * as pages from './pages'
import navigation from './pages/navigation'

const config: ProvisionConfig = {
  env,
  navigation,
  models: Object.values(models),
  pages: Object.values(pages),
  relationships,
}

export default config
