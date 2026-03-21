import { server } from 'skedyul/serverless'
import { toolRegistry, webhookRegistry } from '../registries'
import installHandler from './hooks/install'
import { uninstallHandler } from './hooks/uninstall'
import pkg from '../../package.json'

// Global error handlers to catch unhandled errors during initialization
// Important: Do NOT call process.exit() in Lambda - let Lambda handle the error
process.on('uncaughtException', (err) => {
  console.error('[MCP Server] UNCAUGHT EXCEPTION:', err)
})

process.on('unhandledRejection', (reason) => {
  console.error('[MCP Server] UNHANDLED REJECTION:', reason)
})

// Early startup log to help debug container issues
console.log('[MCP Server] Starting...')
console.log('[MCP Server] NODE_ENV:', process.env.NODE_ENV)
console.log('[MCP Server] AWS_LAMBDA_FUNCTION_NAME:', process.env.AWS_LAMBDA_FUNCTION_NAME || '(not set)')
console.log('[MCP Server] SKEDYUL_COMPUTE_LAYER:', process.env.SKEDYUL_COMPUTE_LAYER || '(not set)')
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
      name: 'Phone',
      version: pkg.version,
    },
    hooks: {
      install: installHandler,
      uninstall: uninstallHandler,
    },
  },
  toolRegistry,
  webhookRegistry,
)

// Extract Lambda handler for serverless mode
const extractedHandler = 'handler' in skedyulServer ? skedyulServer.handler : undefined
console.log('[MCP Server] Handler extracted:', typeof extractedHandler)
console.log('[MCP Server] Handler is function:', typeof extractedHandler === 'function')

if (computeLayer === 'serverless' && typeof extractedHandler !== 'function') {
  console.error('[MCP Server] ERROR: Handler is not a function! Lambda will fail to invoke.')
  console.error('[MCP Server] skedyulServer keys:', Object.keys(skedyulServer))
}

// Export handler - use named export for TypeScript, tsup will convert to CJS
export const handler = extractedHandler

// Start HTTP server if running in dedicated mode (local Docker)
if (computeLayer === 'dedicated' && 'listen' in skedyulServer) {
  const port = parseInt(process.env.PORT || '3000', 10)
  skedyulServer.listen(port)
}

console.log('[MCP Server] Module initialization complete')
