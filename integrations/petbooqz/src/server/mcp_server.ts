import { server } from 'skedyul'
import type { ServerlessServerInstance } from 'skedyul'
import { registry } from '../registry'
import pkg from '../../package.json'

const skedyulServer = server.create(
  {
    computeLayer: 'serverless',
    metadata: {
      name: 'Petbooqz',
      version: pkg.version,
    },
  },
  registry,
)

const serverless = skedyulServer as ServerlessServerInstance

export const handler = serverless.handler
