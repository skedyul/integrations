import type { ProvisionConfig } from 'skedyul'
import env from './env'
import navigation from './pages/navigation'
import relationships from './relationships'
import setup from './setup'
import agency from './models/agency'
import { lead } from './entities'
import * as workflows from './workflows'

import setupPage from './pages/setup'
import agenciesPage from './pages/agencies'
import leadsPage from './pages/leads'

const config: ProvisionConfig = {
  env,
  navigation,
  relationships,
  models: [agency],
  entities: [lead],
  setup,
  workflows: Object.values(workflows),
  pages: [setupPage, agenciesPage, leadsPage],
}

export default config
