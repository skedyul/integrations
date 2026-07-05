import { defineConfig } from 'skedyul'
import pkg from './package.json' with { type: 'json' }
import { toolRegistry, webhookRegistry } from './src/registries'
import provisionConfig from './src/provision'

export default defineConfig({
  name: 'Meta',
  version: pkg.version,
  description: 'WhatsApp, Instagram, and Messenger communication via Meta Graph API',
  computeLayer: 'serverless',

  tools: Promise.resolve({ toolRegistry }),
  webhooks: Promise.resolve({ webhookRegistry }),

  provision: Promise.resolve({ default: provisionConfig }),
})
