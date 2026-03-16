/**
 * Skedyul App Configuration
 * =========================
 *
 * This is the main configuration file for the Reports app.
 * Resources are auto-discovered from the following locations:
 *
 *   crm/models/     - Model definitions (scope declared in each model)
 *   src/tools/      - Tool definitions
 */

import { defineConfig } from 'skedyul'
import pkg from './package.json'

export default defineConfig({
  name: 'Reports',
  version: pkg.version,
  description: 'Report generation and visualization service',
  computeLayer: 'serverless',
})
