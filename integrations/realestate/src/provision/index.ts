import type { ProvisionConfig } from 'skedyul'
import env from './env'
import navigation from './pages/navigation'
import relationships from './relationships'
import lead from './models/lead'
import leadsPage from './pages/leads'

const config: ProvisionConfig = {
  env,
  navigation,
  relationships,
  models: [lead],
  pages: [leadsPage],
}

export default config
