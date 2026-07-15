import { server } from 'skedyul'
import { toolRegistry, webhookRegistry } from '../registries'
import installHandler from './hooks/install'
import provisionHandler from './hooks/provision'
import pkg from '../../package.json'

function getComputeLayer(): 'serverless' | 'dedicated' {
  const envLayer = process.env.SKEDYUL_COMPUTE_LAYER
  if (envLayer === 'serverless' || envLayer === 'dedicated') {
    return envLayer
  }

  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return 'serverless'
  }

  return 'dedicated'
}

const computeLayer = getComputeLayer()

const skedyulServer = server.create({
  name: 'realestate.com.au',
  version: pkg.version,
  description: 'Ingest realestate.com.au lead enquiries via REA Partner Platform webhooks',
  computeLayer,
  tools: toolRegistry,
  webhooks: webhookRegistry,
  hooks: {
    install: {
      handler: installHandler,
      timeout: 60000,
    },
    provision: {
      handler: provisionHandler,
      timeout: 300000,
    },
  },
})

export const handler = 'handler' in skedyulServer ? skedyulServer.handler : undefined

if (computeLayer === 'dedicated' && 'listen' in skedyulServer) {
  const port = parseInt(process.env.PORT || '3000', 10)
  skedyulServer.listen(port)
}
