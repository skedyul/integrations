import type { ProvisionConfig } from 'skedyul'

import env from './env'
import { models, relationships } from './crm'
import { calendarEvent } from './entities'
import * as pages from './pages'
import navigation from './pages/navigation'
import setup from './setup'
import * as workflows from './workflows'

const config: ProvisionConfig = {
  env,
  navigation,
  models: Object.values(models),
  entities: [calendarEvent],
  setup,
  workflows: Object.values(workflows),
  pages: Object.values(pages),
  relationships,
}

export default config
