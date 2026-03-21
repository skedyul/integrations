import { defineConfig } from 'tsup'

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
  // Keep native/binary modules external
  external: ['twilio'],
  // Ensure proper ESM output
  shims: true,
  // Enable tree-shaking
  treeshake: true,
})
