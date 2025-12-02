import { server } from 'skedyul'
import type { DedicatedServerInstance } from 'skedyul'
import { registry } from '../registry'

const skedyulServer = server.create(
  {
    computeLayer: 'dedicated',
    metadata: {
      name: 'Petbooqz',
      version: '1.0.0',
    },
  },
  registry,
)

const dedicatedServer = skedyulServer as DedicatedServerInstance

void (async () => {
  try {
    await dedicatedServer.listen()
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to start Petbooqz dedicated MCP server', error)
  }
})()


