import { defineConfig } from 'skedyul'
import pkg from './package.json'

export default defineConfig({
  name: 'Email',
  version: pkg.version,
  description: 'Send and receive emails with your skedyul.app address',
  computeLayer: 'serverless',
  build: {
    external: ['mailgun.js', 'form-data'],
  },

  tools: import('./src/registries'),
  webhooks: import('./src/registries'),

  provision: import('./provision'),
})
