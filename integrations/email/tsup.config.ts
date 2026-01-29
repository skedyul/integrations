import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/server/mcp_server.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist/server',
  clean: true,
  sourcemap: true,
  splitting: false,
  bundle: true,
  external: ['skedyul'],
})
