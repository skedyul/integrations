import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/server/mcp_server.ts'],
  format: ['cjs'],
  target: 'node22',
  outDir: 'dist/server',
  outExtension: () => ({ js: '.js' }),
  clean: true,
  splitting: false,
  sourcemap: false,
  dts: false,
  // Don't bundle node_modules - they'll be available at runtime
  external: ['skedyul', 'twilio', 'zod'],
  // Ensure proper CJS output for Lambda compatibility
  shims: true,
})
