import type { ProvisionConfig } from 'skedyul'
import env from './env'
import navigation from './pages/navigation'
import relationships from './relationships'
import setup from './setup'
import agency from './models/agency'
import { customer, property, enquiry, propertyOwnership } from './entities'
import * as workflows from './workflows'

import setupPage from './pages/setup'
import agenciesPage from './pages/agencies'

const config: ProvisionConfig = {
  env,
  navigation,
  relationships,
  models: [agency],
  entities: [customer, property, enquiry, propertyOwnership],
  setup,
  workflows: Object.values(workflows),
  pages: [
    setupPage,
    agenciesPage,
  ],
}

export default config
