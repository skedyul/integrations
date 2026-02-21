import { server } from 'skedyul'
import { toolRegistry, webhookRegistry } from '../registries'
import installHandler from './hooks/install'
import provisionHandler from './hooks/provision'
import pkg from '../../package.json'

// Global error handlers to catch any unhandled errors during initialization
process.on('uncaughtException', (err) => {
  console.error('[MCP Server] UNCAUGHT EXCEPTION:', err)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('[MCP Server] UNHANDLED REJECTION:', reason)
  process.exit(1)
})

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
console.log('[MCP Server] PORT::', process.env.PORT || '3000')

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

// Build timestamp to verify fresh deployment
console.log('[MCP Server] BUILD_ID: 2026-02-21-v3')

console.log('[MCP Server] About to call server.create()...')
console.log('[MCP Server] Tool registry keys:', Object.keys(toolRegistry))
console.log('[MCP Server] Webhook registry keys:', Object.keys(webhookRegistry))

let skedyulServer: ReturnType<typeof server.create>
try {
  skedyulServer = server.create(
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
  console.log('[MCP Server] server.create() completed successfully')
} catch (err) {
  console.error('[MCP Server] server.create() FAILED:', err)
  throw err
}

console.log('[MCP Server] Checking skedyulServer type...')
console.log('[MCP Server] skedyulServer keys:', Object.keys(skedyulServer))
console.log('[MCP Server] Has handler:', 'handler' in skedyulServer)
console.log('[MCP Server] Has listen:', 'listen' in skedyulServer)

// Export Lambda handler for serverless mode
console.log('[MCP Server] Extracting handler...')
const extractedHandler = 'handler' in skedyulServer ? skedyulServer.handler : undefined
console.log('[MCP Server] Handler type:', typeof extractedHandler)
console.log('[MCP Server] Handler is function:', typeof extractedHandler === 'function')

export const handler = extractedHandler

console.log('[MCP Server] Handler exported successfully')

// Start HTTP server if running in dedicated mode (local Docker)
if (computeLayer === 'dedicated' && 'listen' in skedyulServer) {
  const port = parseInt(process.env.PORT || '3000', 10)
  console.log('[MCP Server] Starting HTTP server on port', port)
  skedyulServer.listen(port)
}

console.log('[MCP Server] Module initialization complete!')
