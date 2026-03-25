import { defineConfig } from 'skedyul'
import pkg from './package.json'

export default defineConfig({
  name: 'Meta',
  version: pkg.version,
  description: 'WhatsApp, Instagram, and Messenger communication via Meta Graph API',
  computeLayer: 'serverless',

  tools: import('./src/registries'),
  webhooks: import('./src/registries'),

  provision: import('./src/provision'),
})
