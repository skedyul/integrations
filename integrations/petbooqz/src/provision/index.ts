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

const config = {
  env,
  navigation,
  models: Object.values(models),
  agents: Object.values(agents),
  pages: Object.values(pages),
  relationships,
}

// Skills are read from the provision object at deploy time. The published
// ProvisionConfig type does not list them yet, so they are attached here.
Object.assign(config, { skills: [bookingSkill] })

export default config as ProvisionConfig
