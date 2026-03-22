import { defineConfig } from 'skedyul'
import pkg from './package.json'

export default defineConfig({
  name: 'BFT',
  version: pkg.version,
  description: 'Body Fit Training website scraper integration',
  computeLayer: 'serverless',
  build: {
    external: ['playwright'],
  },

  tools: import('./src/registries'),

  provision: import('./provision'),
})
