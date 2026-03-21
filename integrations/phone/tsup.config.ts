import { defineConfig } from 'tsup'
import { builtinModules } from 'module'

export default defineConfig({
  entry: ['src/server/mcp_server.ts'],
  format: ['esm'],
  target: 'node22',
  outDir: 'dist/server',
  clean: true,
  splitting: false,
  sourcemap: false,
  dts: false,
  // Bundle skedyul and its dependencies to avoid CJS/ESM interop issues
  // The @modelcontextprotocol/sdk is ESM-only, so we need to bundle it
  noExternal: ['skedyul', 'zod', '@modelcontextprotocol/sdk'],
  // Keep native/binary modules and Node.js built-ins external
  external: [
    'twilio',
    // Node.js built-in modules must be external to avoid "Dynamic require" errors
    ...builtinModules,
    ...builtinModules.map(m => `node:${m}`),
  ],
  // Ensure proper ESM output
  shims: true,
  // Enable tree-shaking
  treeshake: true,
})
