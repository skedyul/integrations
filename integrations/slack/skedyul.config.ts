import { defineConfig } from 'skedyul'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  name: 'Slack',
  version: pkg.version,
  description: 'Slack channels and direct messages',
  computeLayer: 'serverless',

  tools: import('./src/registries'),
  webhooks: import('./src/registries'),

  provision: import('./src/provision'),
})
