# Petbooqz Integration (Node.js 22 Lambda)

This is the Petbooqz integration for Skedyul, a **serverless** MCP server targeting the `public.ecr.aws/lambda/nodejs:22` runtime.

## Structure

- `tsconfig.json` – TypeScript configuration.
- `src/registry.ts` – central registry mapping tool IDs to implementations.
- `src/tools/` – Petbooqz API tool implementations:
  - `clients.get` – Get client details
  - `patients.get` – Get patient details
  - `appointment_types.list` – List available appointment types
  - `calenders.list` – List available calendars
  - `calendar_slots.*` – Calendar slot management (reserve, confirm, cancel, etc.)
- `src/lib/api-client.ts` – Petbooqz API client with Base64 authentication.
- `src/server/mcp-server.ts` – MCP server entrypoint.
- `Dockerfile` – builds TS → JS (`dist/**`) and produces a Lambda-compatible Node 22 image.
- `template.yaml` – AWS SAM template for local testing and deployment.
- `samconfig.toml` – SAM CLI configuration file.

## Environment Variables

The integration requires the following environment variables:

- `PETBOOQZ_BASE_URL` – Base URL for the Petbooqz API
- `PETBOOQZ_USERNAME` – API username (provided by Cider House ICT)
- `PETBOOQZ_PASSWORD` – API password (provided by Cider House ICT)

## Commands

```bash
npm install
npm run build
npm start
npm test   # runs Node.js native test runner against tests/**/*.test.js
```

## Available Tools

The integration provides the following tools:

- **clients.get** – Retrieve client information by ID
- **patients.get** – Retrieve patient information by ID
- **appointment_types.list** – List all available appointment types
- **calenders.list** – List all available calendars/columns
- **calender_slots.get** – Check appointment slot details
- **calendar_slots.availibility.list** – Get available time slots for specified calendars and dates
- **calendar_slots.reserve** – Reserve a time slot temporarily
- **calendar_slots.confirm** – Confirm a reserved slot with client and patient information
- **calendar_slots.release** – Release a temporarily reserved slot
- **calendar_slots.cancel** – Cancel a confirmed appointment

### Build Docker Image

```bash
docker build -t petbooqz:latest .
```

To include environment variables at build time:

```bash
docker build \
  --build-arg MCP_ENV_JSON='{"PETBOOQZ_BASE_URL":"https://api.example.com","PETBOOQZ_USERNAME":"user","PETBOOQZ_PASSWORD":"pass"}' \
  -t petbooqz:latest .
```

### Test the Registry

For local testing, you can use AWS SAM CLI or test the handler directly. Here's a simple test using a Node.js script:

```bash
# Build the project first
npm run build

# Test using the included test suite
npm test
```

### AWS SAM Setup

This integration includes AWS SAM configuration for local testing and deployment.

**Prerequisites:**
- [Install AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- Docker must be running

**1. Build the Docker Image:**
```bash
docker build -t petbooqz:latest .
```

**2. Start Local API with SAM:**
```bash
sam local start-api --docker-network bridge
```

This will:
- Start a local API Gateway on `http://localhost:3000`
- Use the Docker image you built
- Handle all MCP endpoints (`/mcp`, `/health`, `/estimate`)

**3. Alternative: Build and Start in One Command:**
```bash
sam build && sam local start-api
```

**4. Test with SAM Local Invoke (for individual function testing):**
```bash
# Test the health endpoint
sam local invoke McpServerFunction -e events/health-event.json

# Test listing tools
sam local invoke McpServerFunction -e events/mcp-list-event.json

# Test calling a tool (e.g., appointment_types.list)
sam local invoke McpServerFunction -e events/mcp-call-event.json
```


Once the server is running (via SAM or deployed), test the registry with:

**1. Health Check:**
```bash
curl -X GET http://localhost:3000/health
```

**2. List Available Tools:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

**3. List Appointment Types:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "appointment_types.list",
      "arguments": {
        "inputs": {}
      }
    }
  }'
```

**4. Get Client Information:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "clients.get",
      "arguments": {
        "inputs": {
          "client_id": "C10287851"
        }
      }
    }
  }'
```

**5. List Available Calendars:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "calenders.list",
      "arguments": {
        "inputs": {}
      }
    }
  }'
```

**6. Get Available Slots:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "calendar_slots.availibility.list",
      "arguments": {
        "inputs": {
          "calendars": ["C1", "C2"],
          "dates": ["2024-12-20", "2024-12-21"]
        }
      }
    }
  }'
```

**7. Reserve a Slot:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 6,
    "method": "tools/call",
    "params": {
      "name": "calendar_slots.reserve",
      "arguments": {
        "inputs": {
          "calendar_id": "C1",
          "datetime": "2024-12-20 14:00:00",
          "duration": "30",
          "appointment_note": "Regular checkup"
        }
      }
    }
  }'
```

**8. Confirm a Reserved Slot:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 7,
    "method": "tools/call",
    "params": {
      "name": "calendar_slots.confirm",
      "arguments": {
        "inputs": {
          "calendar_id": "C1",
          "slot_id": "1533879346",
          "client_first": "John",
          "client_last": "Doe",
          "email_address": "john.doe@example.com",
          "phone_number": "0412345678",
          "patient_name": "Max",
          "appointment_type": "Unwell Pet",
          "appointment_note": "Regular checkup"
        }
      }
    }
  }'
```


