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
  // Don't bundle node_modules - they'll be available at runtime
  external: ['skedyul', 'zod'],
  // Ensure proper ESM output
  shims: true,
})
