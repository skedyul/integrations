import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/registries.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
})
