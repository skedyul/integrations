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
  external: ['skedyul', 'zod'],
  shims: true,
})
