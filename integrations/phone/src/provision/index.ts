/**
 * Provision Configuration
 *
 * Aggregates all modular config files into a single provision config.
 * This file is imported by skedyul.config.ts.
 */

import type { ProvisionConfig } from 'skedyul'

import env from './env'
import { models, relationships } from './crm'
import * as channels from './channels'
import * as pages from './pages'
import * as workflows from './workflows'
import navigation from './pages/navigation'

const config: ProvisionConfig = {
  env,
  navigation,
  models: Object.values(models),
  channels: Object.values(channels),
  pages: Object.values(pages),
  workflows: Object.values(workflows),
  relationships,
}

export default config
