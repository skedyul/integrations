# Skedyul Integrations

This package contains official Skedyul integration apps that connect external services to the platform. Each integration is built using the [skedyul-node](../skedyul-node/README.md) SDK.

## Available Integrations

| Integration | Description | Features |
|-------------|-------------|----------|
| [Email](./integrations/email/) | Send and receive emails | Auto-provisioned addresses, attachments, Mailgun provider |
| [Meta](./integrations/meta/) | WhatsApp, Instagram, Messenger | OAuth authentication, message sending/receiving |
| [Phone](./integrations/phone/) | SMS and voice via Twilio | Compliance workflow, call forwarding, webhooks |
| [BFT](./integrations/bft/) | Body Fit Training scraper | Schedule sync, package management |
| [Petbooqz](./integrations/petbooqz/) | Veterinary practice management | Appointments, clients, patients, AI agents |

## Architecture

Each integration follows a standard directory structure:

```
integrations/{name}/
├── package.json
├── skedyul.config.ts          # Main configuration
├── tsconfig.json
├── tsup.config.ts
├── config/
│   ├── provision.config.ts    # Version-level resources
│   └── install.config.ts      # Per-installation env vars
├── src/
│   ├── registries.ts          # Tool + webhook exports
│   ├── server/
│   │   ├── mcp_server.ts      # Server entry point
│   │   └── hooks/
│   │       ├── install.ts     # Install handler
│   │       ├── uninstall.ts   # Cleanup handler
│   │       └── oauth_callback.ts  # OAuth flow (if needed)
│   ├── tools/
│   │   └── {tool_name}.ts     # Individual tools
│   ├── webhooks/
│   │   └── {webhook_name}.ts  # Webhook handlers
│   └── lib/
│       └── {client}.ts        # External API clients
└── dist/                      # Compiled output
```

## Key Concepts

### Configuration Files

#### `skedyul.config.ts`

Main entry point defining app metadata and imports:

```ts
import { defineConfig } from 'skedyul'
import pkg from './package.json'

export default defineConfig({
  name: 'my-integration',
  version: pkg.version,
  description: 'Connect to external service',
  computeLayer: 'serverless',
  tools: import('./src/registries'),
  webhooks: import('./src/registries'),
  provision: import('./config/provision.config'),
  install: import('./config/install.config'),
  agents: [],  // Optional AI agents
})
```

#### `config/provision.config.ts`

Defines version-level resources shared across all installations:

```ts
import type { ProvisionConfig } from 'skedyul'

const config: ProvisionConfig = {
  env: {
    API_URL: {
      label: 'API URL',
      required: true,
      visibility: 'visible',
    },
  },
  models: [
    {
      handle: 'sync_log',
      label: 'Sync Log',
      type: 'INTERNAL',  // App-owned data
      fields: [
        { handle: 'synced_at', label: 'Synced At', type: 'datetime' },
      ],
    },
  ],
  channels: [
    {
      handle: 'sms',
      label: 'SMS',
      identifierLabel: 'Phone Number',
    },
  ],
  pages: [...],
  navigation: {...},
}

export default config
```

#### `config/install.config.ts`

Defines per-installation environment variables collected from users:

```ts
import type { InstallConfig } from 'skedyul'

const config: InstallConfig = {
  env: {
    API_KEY: {
      label: 'API Key',
      required: true,
      visibility: 'encrypted',
      description: 'Your API key from the service dashboard',
    },
  },
}

export default config
```

### Model Scopes

| Scope | Description | Use Case |
|-------|-------------|----------|
| `INTERNAL` | App owns the data | Sync logs, connection status, app-specific records |
| `SHARED` | User maps to existing models | Contacts, appointments, patients |

### Field Ownership

| Owner | Description |
|-------|-------------|
| `APP` | App controls the field (set by webhooks/tools) |
| `WORKPLACE` | User provides the data |
| `BOTH` | Either can update |

### Registries

Tools and webhooks are exported from `src/registries.ts`:

```ts
import type { ToolRegistry, WebhookRegistry } from 'skedyul'

export const toolRegistry: ToolRegistry = {
  send_message: sendMessageTool,
  list_items: listItemsTool,
}

export const webhookRegistry: WebhookRegistry = {
  receive_message: receiveMessageWebhook,
}
```

## Creating a New Integration

### 1. Create the directory structure

```bash
mkdir -p integrations/my-service/{config,src/{tools,webhooks,server/hooks,lib}}
```

### 2. Initialize package.json

```json
{
  "name": "@skedyul/integration-my-service",
  "version": "0.0.1",
  "main": "dist/server/mcp_server.js",
  "scripts": {
    "build": "tsup",
    "dev": "skedyul dev serve"
  },
  "dependencies": {
    "skedyul": "workspace:*"
  }
}
```

### 3. Create skedyul.config.ts

```ts
import { defineConfig } from 'skedyul'
import pkg from './package.json'

export default defineConfig({
  name: 'My Service',
  version: pkg.version,
  description: 'Connect My Service to Skedyul',
  computeLayer: 'serverless',
  tools: import('./src/registries'),
  webhooks: import('./src/registries'),
  provision: import('./config/provision.config'),
  install: import('./config/install.config'),
})
```

### 4. Define a tool

```ts
// src/tools/get_items.ts
import { z } from 'skedyul'
import type { ToolDefinition } from 'skedyul'

const inputSchema = z.object({
  limit: z.number().optional().default(10),
})

const outputSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })),
})

type Input = z.infer<typeof inputSchema>
type Output = z.infer<typeof outputSchema>

export const getItemsTool: ToolDefinition<Input, Output> = {
  name: 'get_items',
  label: 'Get Items',
  description: 'Retrieve items from the service',
  inputSchema,
  outputSchema,
  handler: async (input, context) => {
    const client = createClient(context.env.API_KEY)
    const items = await client.listItems({ limit: input.limit })
    
    return {
      output: { items },
      billing: { credits: 1 },
      meta: {
        success: true,
        message: `Retrieved ${items.length} items`,
        toolName: 'get_items',
      },
    }
  },
}
```

### 5. Create the MCP server

```ts
// src/server/mcp_server.ts
import { server } from 'skedyul'
import { toolRegistry, webhookRegistry } from '../registries'
import installHandler from './hooks/install'
import pkg from '../../package.json'

const skedyulServer = server.create(
  {
    computeLayer: 'serverless',
    metadata: {
      name: 'My Service',
      version: pkg.version,
    },
    hooks: {
      install: { handler: installHandler, timeout: 30000 },
    },
  },
  toolRegistry,
  webhookRegistry,
)

export const handler = skedyulServer.handler
```

### 6. Implement install handler

```ts
// src/server/hooks/install.ts
import type { InstallHandlerContext, InstallHandlerResult } from 'skedyul'
import { MissingRequiredFieldError, AuthenticationError } from 'skedyul'

export default async function install(
  ctx: InstallHandlerContext,
): Promise<InstallHandlerResult> {
  const { API_KEY } = ctx.env

  if (!API_KEY) {
    throw new MissingRequiredFieldError('API_KEY')
  }

  // Validate credentials
  try {
    const client = createClient(API_KEY)
    await client.verifyCredentials()
  } catch (error) {
    throw new AuthenticationError('Invalid API key')
  }

  return { env: {} }
}
```

## Development

### Prerequisites

- Node.js 18+
- pnpm
- Skedyul CLI (`skedyul`)

### Local Development

```bash
# Navigate to integration
cd integrations/my-service

# Authenticate with Skedyul
skedyul auth login

# Link to a test workplace
skedyul dev link --workplace my-test-clinic

# Start development server
skedyul dev serve --workplace my-test-clinic
```

The CLI will:
- Prompt for missing environment variables
- Start an ngrok tunnel
- Register with Skedyul
- Route tool calls to your local server

### Testing Tools

```bash
# Invoke a single tool
skedyul dev invoke get_items --workplace my-test-clinic

# With arguments
skedyul dev invoke get_items --args '{"limit": 5}'

# List all tools
skedyul dev tools

# Validate configuration
skedyul dev validate
```

### Building

```bash
# Build for deployment
pnpm build

# Output in dist/server/mcp_server.js
```

## Documentation

For detailed SDK documentation, see:

- [Authentication](../skedyul-node/docs/authentication.md) - Token types and configuration
- [Tools](../skedyul-node/docs/tools.md) - Building MCP tools
- [Webhooks](../skedyul-node/docs/webhooks.md) - Receiving external events
- [Lifecycle Hooks](../skedyul-node/docs/lifecycle-hooks.md) - Install, provision, uninstall
- [Core API](../skedyul-node/docs/core-api.md) - Platform client methods
- [Configuration](../skedyul-node/docs/configuration.md) - skedyul.config.ts reference
- [Errors](../skedyul-node/docs/errors.md) - Error handling patterns
