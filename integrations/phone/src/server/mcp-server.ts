import { server } from 'skedyul'
import { registry } from '../registry'

const skedyulServer = server.create(
  {
    computeLayer: 'serverless',
    metadata: {
      name: 'Phone',
      version: '1.0.0',
    },
  },
  registry,
)

const serverless = skedyulServer

export const handler = serverless.handler
