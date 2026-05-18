import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/server/mcp_server.ts'],
  format: ['esm'],
  target: 'node22',
  outDir: 'dist/server',
  clean: true,
  splitting: false,
  dts: false,
  outExtension({ format }) {
    return { js: '.mjs' }
  },
  external: ['skedyul', 'skedyul/serverless', 'zod'],
})
