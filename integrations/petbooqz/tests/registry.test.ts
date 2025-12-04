/// <reference types="node" />
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { server } from 'skedyul'
import type {
  ServerlessServerInstance,
  ToolMetadata,
  ToolRegistry,
} from 'skedyul'
import { registry } from '../src/registry'

type MockResponse = {
  ok: boolean
  status: number
  statusText: string
  headers: { get(name: string): string | null }
  json(): Promise<unknown>
  text(): Promise<string>
}

function createJsonResponse(data: unknown): MockResponse {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: {
      get(name: string): string | null {
        return name.toLowerCase() === 'content-type'
          ? 'application/json'
          : null
      },
    },
    async json() {
      return data
    },
    async text() {
      return JSON.stringify(data)
    },
  }
}

test('appointment_types.list returns mocked appointment types', async () => {
  const originalFetch = globalThis.fetch
  const mockAppointments = [
    {
      id: '1',
      code: 'CONS',
      name: 'Consultation',
      duration: '30',
    },
  ]

  let requestedUrl: string | undefined

  globalThis.fetch = (async (input: unknown) => {
    requestedUrl = String(input)
    return createJsonResponse(mockAppointments)
  }) as typeof fetch

  try {
    process.env.PETBOOQZ_BASE_URL = 'https://api.petbooqz.test'
    process.env.PETBOOQZ_USERNAME = 'user'
    process.env.PETBOOQZ_PASSWORD = 'pass'

    const serverless = server.create(
      {
        computeLayer: 'serverless',
        metadata: {
          name: 'petbooqz-test',
          version: '0.0.1',
        },
      },
      registry as ToolRegistry,
    ) as ServerlessServerInstance

    const { handler } = serverless

    const toolCall = {
      jsonrpc: '2.0' as const,
      id: 1,
      method: 'tools/call',
      params: {
        name: 'appointment_types.list',
        arguments: {},
      },
    }

    const response = await handler({
      path: '/mcp',
      httpMethod: 'POST',
      body: JSON.stringify(toolCall),
      headers: {},
      queryStringParameters: null,
      requestContext: { requestId: 'appt-list' },
    })

    assert.strictEqual(response.statusCode, 200)
    const parsed = JSON.parse(response.body)
    assert.ok(parsed.result)

    // Our server wraps tool output as JSON text in result.content[0].text
    const output = JSON.parse(parsed.result.content[0].text)
    assert.ok(Array.isArray(output.appointmentTypes))
    assert.deepStrictEqual(output.appointmentTypes, mockAppointments)

    assert.ok(requestedUrl)
    assert.ok(
      requestedUrl?.endsWith('/appointmenttypes'),
      `Expected request to /appointmenttypes, got ${requestedUrl}`,
    )
  } finally {
    globalThis.fetch = originalFetch
    delete process.env.PETBOOQZ_BASE_URL
    delete process.env.PETBOOQZ_USERNAME
    delete process.env.PETBOOQZ_PASSWORD
  }
})

test('calendar_slots.cancel calls mocked DELETE endpoint and returns success', async () => {
  const originalFetch = globalThis.fetch
  const requested: { url?: string; method?: string } = {}

  globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
    requested.url = String(input)
    requested.method = init?.method ?? 'GET'
    return createJsonResponse(undefined)
  }) as typeof fetch

  try {
    process.env.PETBOOQZ_BASE_URL = 'https://api.petbooqz.test'
    process.env.PETBOOQZ_USERNAME = 'user'
    process.env.PETBOOQZ_PASSWORD = 'pass'

    const serverless = server.create(
      {
        computeLayer: 'serverless',
        metadata: {
          name: 'petbooqz-cancel-test',
          version: '0.0.1',
        },
      },
      registry as ToolRegistry,
    ) as ServerlessServerInstance

    const { handler } = serverless

    const toolCall = {
      jsonrpc: '2.0' as const,
      id: 1,
      method: 'tools/call',
      params: {
        name: 'calendar_slots.cancel',
        arguments: {
          calendar_id: 'cal-1',
          slot_id: 'slot-1',
        },
      },
    }

    const response = await handler({
      path: '/mcp',
      httpMethod: 'POST',
      body: JSON.stringify(toolCall),
      headers: {},
      queryStringParameters: null,
      requestContext: { requestId: 'cancel' },
    })

    assert.strictEqual(response.statusCode, 200)
    const parsed = JSON.parse(response.body)
    assert.ok(parsed.result)
    const output = JSON.parse(parsed.result.content[0].text)
    assert.strictEqual(output.success, true)

    assert.strictEqual(requested.method, 'DELETE')
    assert.ok(
      requested.url?.startsWith(
        'https://api.petbooqz.test/calendars/cal-1/cancel',
      ),
      `Unexpected URL: ${requested.url}`,
    )
  } finally {
    globalThis.fetch = originalFetch
    delete process.env.PETBOOQZ_BASE_URL
    delete process.env.PETBOOQZ_USERNAME
    delete process.env.PETBOOQZ_PASSWORD
  }
})

test('appointments.book reserves and confirms a slot via MCP server', async () => {
  const originalFetch = globalThis.fetch

  const requested: Array<{ url: string; method: string }> = []

  globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'

    requested.push({ url, method })

    if (url.endsWith('/calendars') && method === 'GET') {
      return createJsonResponse([
        {
          column: 'cal-1',
          name: 'Main calendar',
        },
      ])
    }

    if (url.endsWith('/slots') && method === 'POST') {
      return createJsonResponse([
        {
          calendar: 'cal-1',
          date: '2025-12-02',
          slots: ['17:00'],
        },
      ])
    }

    if (url.endsWith('/calendars/cal-1/reserve') && method === 'POST') {
      return createJsonResponse([
        {
          slot_id: 123,
        },
      ])
    }

    if (url.endsWith('/calendars/cal-1/confirm') && method === 'POST') {
      return createJsonResponse({
        client_id: 'client-1',
        patient_id: 'patient-1',
      })
    }

    return createJsonResponse(undefined)
  }) as typeof fetch

  try {
    process.env.PETBOOQZ_BASE_URL = 'https://api.petbooqz.test'
    process.env.PETBOOQZ_USERNAME = 'user'
    process.env.PETBOOQZ_PASSWORD = 'pass'

    const serverless = server.create(
      {
        computeLayer: 'serverless',
        metadata: {
          name: 'petbooqz-book-appointment-test',
          version: '0.0.1',
        },
      },
      registry as ToolRegistry,
    ) as ServerlessServerInstance

    const { handler } = serverless

    const toolCall = {
      jsonrpc: '2.0' as const,
      id: 1,
      method: 'tools/call',
      params: {
        name: 'appointments.book',
        arguments: {
          datetime: '2025-12-02T17:00:00',
          durationMinutes: 30,
          clientFirst: 'Jane',
          clientLast: 'Doe',
          emailAddress: 'jane@example.com',
          phoneNumber: '+15555555555',
          patientName: 'Fluffy',
          appointmentType: 'CONSULTATION',
        },
      },
    }

    const response = await handler({
      path: '/mcp',
      httpMethod: 'POST',
      body: JSON.stringify(toolCall),
      headers: {},
      queryStringParameters: null,
      requestContext: { requestId: 'book-appointment' },
    })

    assert.strictEqual(response.statusCode, 200)

    const parsed = JSON.parse(response.body)
    assert.ok(parsed.result)

    const outputText = parsed.result.content[0]?.text as string | undefined
    assert.ok(outputText, 'appointments.book should return JSON text content')

    const output = JSON.parse(outputText) as {
      success: boolean
      message: string
      calendarName?: string
      requestedTime?: string
      reservedTime?: string
      slotId?: number
      clientId?: string | null
      patientId?: string | null
    }

    assert.strictEqual(output.success, true)
    assert.strictEqual(output.calendarName, 'Main calendar')
    assert.strictEqual(output.requestedTime, '2025-12-02T17:00:00')
    assert.strictEqual(output.reservedTime, '2025-12-02T17:00')
    assert.strictEqual(output.slotId, 123)
    assert.strictEqual(output.clientId, 'client-1')
    assert.strictEqual(output.patientId, 'patient-1')

    const calledUrls = requested.map((entry) => entry.url)
    assert.ok(
      calledUrls.some((url) => url.endsWith('/calendars')),
      'Expected calendars endpoint to be called',
    )
    assert.ok(
      calledUrls.some((url) => url.endsWith('/slots')),
      'Expected slots endpoint to be called',
    )
    assert.ok(
      calledUrls.some((url) => url.endsWith('/calendars/cal-1/reserve')),
      'Expected reserve endpoint to be called',
    )
    assert.ok(
      calledUrls.some((url) => url.endsWith('/calendars/cal-1/confirm')),
      'Expected confirm endpoint to be called',
    )
  } finally {
    globalThis.fetch = originalFetch
    delete process.env.PETBOOQZ_BASE_URL
    delete process.env.PETBOOQZ_USERNAME
    delete process.env.PETBOOQZ_PASSWORD
  }
})

test('MCP tools/list returns JSON schemas for every tool', async () => {
  const serverless = server.create(
    {
      computeLayer: 'serverless',
      metadata: {
        name: 'petbooqz-tools-list-test',
        version: '0.0.1',
      },
    },
    registry as ToolRegistry,
  ) as ServerlessServerInstance

  const { handler } = serverless

  const listRequest = {
    jsonrpc: '2.0' as const,
    id: 1,
    method: 'tools/list',
    params: {},
  }

  const response = await handler({
    path: '/mcp',
    httpMethod: 'POST',
    body: JSON.stringify(listRequest),
    headers: {},
    queryStringParameters: null,
    requestContext: { requestId: 'tools-list' },
  })

  assert.strictEqual(response.statusCode, 200)
  const parsed = JSON.parse(response.body)
  assert.ok(parsed.result)

  const tools = parsed.result.tools as ToolMetadata[]

  // Ensure all registry tools are exposed by MCP tools/list
  const toolNames = tools.map((t) => t.name).sort()
  const registryNames = Object.keys(registry).sort()
  assert.deepStrictEqual(toolNames, registryNames)

  const appointmentsTool = tools.find(
    (t) => t.name === 'appointment_types.list',
  )
  assert.ok(
    appointmentsTool,
    'appointment_types.list should be present in tools/list',
  )

  const cancelTool = tools.find((t) => t.name === 'calendar_slots.cancel')
  assert.ok(cancelTool, 'calendar_slots.cancel should be present in tools/list')

  assertJsonSchemaObject(
    appointmentsTool?.inputSchema,
    'appointment_types.list inputSchema',
  )
  assertJsonSchemaObject(
    appointmentsTool?.outputSchema,
    'appointment_types.list outputSchema',
  )
  assertJsonSchemaObject(
    cancelTool?.inputSchema,
    'calendar_slots.cancel inputSchema',
  )
  assertJsonSchemaObject(
    cancelTool?.outputSchema,
    'calendar_slots.cancel outputSchema',
  )

  const outputSchema = appointmentsTool?.outputSchema as
    | Record<string, unknown>
    | undefined
  assert.strictEqual(outputSchema?.type, 'object')
  const outputProperties = outputSchema?.properties as
    | Record<string, { type?: string }>
    | undefined
  assert.ok(outputProperties)
  assert.strictEqual(
    outputProperties?.appointmentTypes?.type ?? 'array',
    'array',
    'appointment_types.list outputSchema should describe an array',
  )
})

function assertJsonSchemaObject(
  schema: unknown,
  label: string,
): asserts schema is Record<string, unknown> {
  if (!schema || typeof schema !== 'object') {
    assert.fail(`${label} is missing or not an object`)
  }
  const keys = Object.keys(schema as Record<string, unknown>)
  assert.ok(keys.length > 0, `${label} should contain JSON Schema data`)
}






