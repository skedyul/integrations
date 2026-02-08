import { server } from 'skedyul'
import { toolRegistry, webhookRegistry } from '../registries'
import installHandler from '../install'
import provisionHandler from '../provision'
import pkg from '../../package.json'

// Early startup log to help debug container issues
console.log('[MCP Server] Starting Email app...')
console.log('[MCP Server] NODE_ENV:', process.env.NODE_ENV)
console.log(
  '[MCP Server] AWS_LAMBDA_FUNCTION_NAME:',
  process.env.AWS_LAMBDA_FUNCTION_NAME || '(not set)',
)
console.log(
  '[MCP Server] SKEDYUL_COMPUTE_LAYER:',
  process.env.SKEDYUL_COMPUTE_LAYER || '(not set)',
)
console.log('[MCP Server] PORT:', process.env.PORT || '3000')

/**
 * Determine compute layer based on environment:
 * - SKEDYUL_COMPUTE_LAYER env var (explicit override)
 * - AWS_LAMBDA_FUNCTION_NAME presence (Lambda runtime detection)
 * - Default to 'dedicated' for local Docker containers
 */
function getComputeLayer(): 'serverless' | 'dedicated' {
  // Explicit override via environment variable
  const envLayer = process.env.SKEDYUL_COMPUTE_LAYER
  if (envLayer === 'serverless' || envLayer === 'dedicated') {
    console.log(`[MCP Server] Using compute layer from env: ${envLayer}`)
    return envLayer
  }

  // Auto-detect Lambda runtime
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    console.log('[MCP Server] Detected Lambda runtime, using serverless mode')
    return 'serverless'
  }

  // Default to dedicated for local Docker
  console.log('[MCP Server] Defaulting to dedicated mode (HTTP server)')
  return 'dedicated'
}

const computeLayer = getComputeLayer()
console.log(`[MCP Server] Final compute layer: ${computeLayer}`)

const skedyulServer = server.create(
  {
    computeLayer,
    metadata: {
      name: 'Email',
      version: pkg.version,
    },
    hooks: {
      install: {
        handler: installHandler,
        timeout: 60000, // 1 minute default
      },
      provision: {
        handler: provisionHandler,
        timeout: 300000, // 5 minutes default
      },
    },
  },
  toolRegistry,
  webhookRegistry,
)

// Export Lambda handler for serverless mode
export const handler =
  'handler' in skedyulServer ? skedyulServer.handler : undefined

// Start HTTP server if running in dedicated mode (local Docker)
if (computeLayer === 'dedicated' && 'listen' in skedyulServer) {
  const port = parseInt(process.env.PORT || '3000', 10)
  skedyulServer.listen(port)
}
