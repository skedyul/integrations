/**
 * Provision Configuration
 *
 * Aggregates all modular config files into a single provision config.
 * This file is imported by skedyul.config.ts.
 *
 * Petbooqz clients and patients are entities: the workplace maps them onto
 * its CRM in Settings → CRM → Sources. The app has no install pages.
 */

import type { ProvisionConfig } from 'skedyul'

import env from './env'
import { client, patient } from './entities'
import * as agents from './agents'

const config: ProvisionConfig = {
  env,
  entities: [client, patient],
  agents: Object.values(agents),
}

export default config
