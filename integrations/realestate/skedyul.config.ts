import { defineConfig } from 'skedyul'
import pkg from './package.json' with { type: 'json' }
import catalogMeta from './src/events/catalog.json' with { type: 'json' }
import catalogExamples from './src/events/catalog-examples.json' with { type: 'json' }
import catalogContextFields from './src/events/catalog-context-fields.json' with { type: 'json' }

const events = catalogMeta.map((entry) => {
  const examplePayload = catalogExamples[entry.name as keyof typeof catalogExamples]
  const contextFields =
    catalogContextFields[entry.name as keyof typeof catalogContextFields]

  return {
    ...entry,
    workflowInputType: `@app/realestate/${entry.name.replace(/\./g, '/')}`,
    ...(examplePayload ? { examplePayload } : {}),
    ...(contextFields ? { contextFields } : {}),
  }
})

export default defineConfig({
  handle: 'realestate',
  name: 'realestate.com.au',
  version: pkg.version,
  description: 'Ingest realestate.com.au lead enquiries via REA Partner Platform webhooks',
  computeLayer: 'serverless',

  tools: import('./src/registries'),
  webhooks: import('./src/registries'),

  provision: import('./src/provision'),
  events,
})
