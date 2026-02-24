/**
 * Provision Configuration
 *
 * Aggregates all modular config files for the Meta app.
 */

import type { ProvisionConfig } from 'skedyul'

import env from './env'
import { models, relationships } from './crm'
import * as channels from './channels'
import * as pages from './pages'
import navigation from './pages/navigation'

const config: ProvisionConfig = {
  env,
  navigation,
  models: Object.values(models),
  channels: Object.values(channels),
  pages: Object.values(pages),
  relationships,
}

export default config
