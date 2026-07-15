import type { ProvisionConfig } from 'skedyul'
import env from './env'
import navigation from './pages/navigation'
import relationships from './relationships'
import lead from './models/lead'
import agency from './models/agency'
import leadsPage from './pages/leads'

const config: ProvisionConfig = {
  env,
  navigation,
  relationships,
  models: [lead, agency],
  pages: [leadsPage],
}

export default config
