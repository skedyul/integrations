# Petbooqz Integration

Veterinary practice management system integration with AI-powered booking agents.

## Features

- **Client Management**: Search and retrieve client/owner records
- **Patient Management**: Access pet/patient information and history
- **Appointment Booking**: Check availability, reserve, and confirm appointments
- **AI Agents**: Specialized agents for booking, search, and cancellation workflows
- **Calendar Management**: List calendars and check slot availability

## Architecture

```
src/
├── lib/
│   ├── api_client.ts     # Petbooqz API client
│   ├── types.ts          # TypeScript types
│   └── response.ts       # Response formatting
├── tools/
│   ├── calendars_list.ts                  # List calendars
│   ├── calendar_slots_availability_list.ts # Check availability
│   ├── calendar_slots_reserve.ts          # Reserve a slot
│   ├── calendar_slots_confirm.ts          # Confirm reservation
│   ├── calendar_slots_book.ts             # Reserve + confirm
│   ├── calendar_slots_get.ts              # Get slot details
│   ├── calendar_slots_release.ts          # Release reservation
│   ├── calendar_slots_cancel.ts           # Cancel appointment
│   ├── appointment_types_list.ts          # List appointment types
│   ├── clients_search.ts                  # Search clients
│   ├── clients_get.ts                     # Get client details
│   ├── patients_get.ts                    # Get patient details
│   ├── patient_history_get.ts             # Get patient history
│   ├── patient_history_create.ts          # Create history entry
│   ├── asap_orders_get.ts                 # Get ASAP orders
│   └── verify_credentials.ts              # Validate API credentials
├── server/
│   ├── mcp_server.ts     # MCP server entry point
│   └── hooks/
│       └── install.ts    # Install handler with credential validation
└── registries.ts         # Tool exports
```

## AI Agents

The integration includes 4 specialized AI agents for booking workflows:

### booking_query_agent

Answers questions about calendars and availability.

**Tools**: `calendars_list`, `calendar_slots_availability_list`

```
User: "What times are available tomorrow?"
Agent: Uses calendar_slots_availability_list to check slots
```

### booking_search_agent

Finds clients and patients by name, email, or phone.

**Tools**: `clients_search`, `clients_get`, `patients_get`

```
User: "Find John Smith's dog Max"
Agent: 1. clients_search for "John Smith"
       2. clients_get for full details
       3. patients_get for Max's record
```

### booking_agent

Books appointments and checks availability.

**Tools**: `calendar_slots_availability_list`, `calendar_slots_book`

```
User: "Book an appointment for Max tomorrow at 2pm"
Agent: 1. Check availability
       2. Book the slot (reserve + confirm)
```

### booking_cancel_agent

Cancels appointments and checks status.

**Tools**: `calendar_slots_get`, `calendar_slots_cancel`

```
User: "Cancel Max's appointment"
Agent: 1. Get appointment details
       2. Cancel the appointment
```

## Tools

### Calendar Tools

| Tool | Description |
|------|-------------|
| `calendars_list` | List available calendars/rooms |
| `calendar_slots_availability_list` | Check available slots for date/calendar |
| `calendar_slots_reserve` | Reserve a slot (temporary hold) |
| `calendar_slots_confirm` | Confirm a reserved slot |
| `calendar_slots_book` | Reserve and confirm in one step |
| `calendar_slots_get` | Get appointment/slot details |
| `calendar_slots_release` | Release a reserved slot |
| `calendar_slots_cancel` | Cancel a confirmed appointment |
| `appointment_types_list` | List available appointment types |

### Client/Patient Tools

| Tool | Description |
|------|-------------|
| `clients_search` | Search clients by name, email, or phone |
| `clients_get` | Get full client details |
| `patients_get` | Get patient/pet details |
| `patient_history_get` | Get patient medical history |
| `patient_history_create` | Create a history entry |

### Other Tools

| Tool | Description |
|------|-------------|
| `asap_orders_get` | Get ASAP/urgent orders |
| `verify_credentials` | Validate API credentials |

## Models

### client (SHARED)

Client/Owner records mapped to user's existing model.

| Field | Type | Owner | Description |
|-------|------|-------|-------------|
| `petbooqz_id` | STRING | APP | External ID from Petbooqz |

### patient (SHARED)

Patient/Pet records mapped to user's existing model.

| Field | Type | Owner | Description |
|-------|------|-------|-------------|
| `petbooqz_id` | STRING | APP | External ID from Petbooqz |

**Relationship**: Many patients to one client (owner)

### appointment (SHARED)

Appointment records mapped to user's existing model.

| Field | Type | Owner | Description |
|-------|------|-------|-------------|
| `petbooqz_id` | STRING | APP | External ID from Petbooqz |

**Relationship**: Many appointments to one patient

## Environment Variables

### Provision-Level (Developer)

No provision-level environment variables required.

### Install-Level (User)

| Variable | Required | Description |
|----------|----------|-------------|
| `PETBOOQZ_BASE_URL` | Yes | Server address (e.g., `60.240.27.225:36680`) |
| `PETBOOQZ_USERNAME` | Yes | API username |
| `PETBOOQZ_PASSWORD` | Yes | API password |
| `PETBOOQZ_API_KEY` | Yes | API key from Petbooqz |
| `PETBOOQZ_CLIENT_PRACTICE` | Yes | Client practice ID for multi-practice setups |

## Pages

| Page | Path | Description |
|------|------|-------------|
| Clients | `/clients` | Configure client model mapping (default) |
| Patients | `/patients` | Configure patient model mapping |
| Appointments | `/appointments` | Configure appointment model mapping |

## Install Flow

1. User provides Petbooqz server URL and credentials
2. Install handler validates credentials via `verify_credentials`
3. URL is normalized (adds `http://` if missing)
4. Models are mapped to user's existing data

```ts
// src/server/hooks/install.ts
export default async function install(ctx: InstallHandlerContext) {
  const { PETBOOQZ_BASE_URL, PETBOOQZ_USERNAME, PETBOOQZ_PASSWORD, PETBOOQZ_API_KEY } = ctx.env

  // Validate required fields
  if (!PETBOOQZ_BASE_URL) throw new MissingRequiredFieldError('PETBOOQZ_BASE_URL')
  if (!PETBOOQZ_USERNAME) throw new MissingRequiredFieldError('PETBOOQZ_USERNAME')
  // ...

  // Normalize URL
  let baseUrl = PETBOOQZ_BASE_URL
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `http://${baseUrl}`
  }

  // Verify credentials
  const client = createApiClient(baseUrl, PETBOOQZ_USERNAME, PETBOOQZ_PASSWORD, PETBOOQZ_API_KEY)
  await client.verifyCredentials()

  return {
    env: { PETBOOQZ_BASE_URL: baseUrl },
  }
}
```

## Booking Workflow

### Reserve and Confirm (Two-Step)

```ts
// 1. Reserve a slot (temporary hold)
const reservation = await calendar_slots_reserve({
  calendar_id: 'room-1',
  date: '2024-01-15',
  time: '14:00',
  duration: 30,
  patient_id: 'patient-123',
})

// 2. Confirm the reservation
const appointment = await calendar_slots_confirm({
  reservation_id: reservation.id,
})
```

### Book (One-Step)

```ts
// Reserve and confirm in one call
const appointment = await calendar_slots_book({
  calendar_id: 'room-1',
  date: '2024-01-15',
  time: '14:00',
  duration: 30,
  patient_id: 'patient-123',
})
```

## Development

```bash
# Navigate to integration
cd integrations/petbooqz

# Link to test workplace
skedyul dev link --workplace my-vet-clinic

# Start development server
skedyul dev serve --workplace my-vet-clinic
```

### Testing Tools

```bash
# List calendars
skedyul dev invoke calendars_list --workplace my-vet-clinic

# Check availability
skedyul dev invoke calendar_slots_availability_list \
  --workplace my-vet-clinic \
  --args '{"calendar_names": ["Room 1"], "dates": ["2024-01-15"]}'

# Search clients
skedyul dev invoke clients_search \
  --workplace my-vet-clinic \
  --args '{"query": "John Smith"}'
```

## Troubleshooting

### "Invalid credentials" error

1. Verify the server URL is correct and accessible
2. Check username, password, and API key
3. Ensure the client practice ID is correct

### Connection timeout

1. Verify the Petbooqz server is running
2. Check network connectivity to the server
3. Ensure the URL includes the correct port

### Slot not available

1. Use `calendar_slots_availability_list` to check current availability
2. Verify the calendar name is correct
3. Check if the slot was already booked
