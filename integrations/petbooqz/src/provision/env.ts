/**
 * Environment Variables
 *
 * All environment variables with their scope:
 * - 'provision': Developer-configured, shared across all installations
 * - 'install': User-configured during app installation
 */

import { defineEnv } from 'skedyul'

export default defineEnv({
  PETBOOQZ_BASE_URL: {
    label: 'Petbooqz Server URL',
    scope: 'install',
    required: true,
    visibility: 'visible',
    placeholder: '60.240.27.225:36680',
    description: 'Server address for Petbooqz (e.g., 60.240.27.225:36680 or http://your-server.com)',
  },
  PETBOOQZ_USERNAME: {
    label: 'API Username',
    scope: 'install',
    required: true,
    visibility: 'encrypted',
    description: 'Username for Petbooqz API authentication',
  },
  PETBOOQZ_PASSWORD: {
    label: 'API Password',
    scope: 'install',
    required: true,
    visibility: 'encrypted',
    description: 'Password for Petbooqz API authentication',
  },
  PETBOOQZ_API_KEY: {
    label: 'API Key',
    scope: 'install',
    required: true,
    visibility: 'encrypted',
    description: 'API key provided by Petbooqz',
  },
  PETBOOQZ_CLIENT_PRACTICE: {
    label: 'Client Practice ID',
    scope: 'install',
    required: true,
    visibility: 'visible',
    description: 'Optional client practice identifier for multi-practice setups',
  },
})
