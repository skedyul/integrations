/**
 * Provision Configuration
 *
 * Aggregates all modular config files into a single provision config.
 * This file is imported by skedyul.config.ts.
 */

import type { ProvisionConfig } from 'skedyul'

import env from './env'
import { models, relationships } from './crm'
import * as agents from './agents'
import * as pages from './pages'
import navigation from './pages/navigation'
import bookingSkill from './skills/booking'

const config: ProvisionConfig = {
  env,
  navigation,
  models: Object.values(models),
  agents: Object.values(agents),
  pages: Object.values(pages),
  relationships,
}

// skills is read by platform provision. The pinned SDK type does not list it,
// so it is added on the exported object rather than inside the typed literal.
export default {
  ...config,
  skills: [bookingSkill],
}
