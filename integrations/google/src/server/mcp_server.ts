import { server } from 'skedyul'
import { toolRegistry, webhookRegistry } from '../registries'
import installHandler from './hooks/install'
import oauthCallbackHandler from './hooks/oauth_callback'
import provisionHandler from './hooks/provision'
import uninstallHandler from './hooks/uninstall'
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
  name: 'Google',
  version: pkg.version,
  description: 'Google Calendar integration with OAuth, sync, and event tools',
  computeLayer,
  tools: toolRegistry,
  webhooks: webhookRegistry,
  hooks: {
    install: {
      handler: installHandler,
      timeout: 30000,
    },
    oauth_callback: {
      handler: oauthCallbackHandler,
      timeout: 60000,
    },
    provision: {
      handler: provisionHandler,
      timeout: 300000,
    },
    uninstall: {
      handler: uninstallHandler,
      timeout: 120000,
    },
  },
})

export const handler = 'handler' in skedyulServer ? skedyulServer.handler : undefined

if (computeLayer === 'dedicated' && 'listen' in skedyulServer) {
  const port = parseInt(process.env.PORT || '3000', 10)
  skedyulServer.listen(port)
}
