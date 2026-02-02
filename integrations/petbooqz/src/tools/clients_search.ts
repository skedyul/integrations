import { z, type ToolDefinition } from 'skedyul'
import { createClientFromEnv } from '../lib/api_client'

export interface ClientSearchResult {
  client_id: string
  patient_id: string
  title?: string
  first_name?: string
  last_name?: string
  email_address?: string
  mobile_number?: string
  [key: string]: unknown
}

const ClientsSearchInputSchema = z.object({
  phone: z.string().describe('Mobile phone number (e.g., 0456789123 or 61456789123)'),
})

const ClientsSearchOutputSchema = z.object({
  clients: z.array(z.object({
    client_id: z.string(),
    patient_id: z.string(),
    title: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email_address: z.string().optional(),
    mobile_number: z.string().optional(),
  }).passthrough()),
})

type ClientsSearchInput = z.infer<typeof ClientsSearchInputSchema>
type ClientsSearchOutput = z.infer<typeof ClientsSearchOutputSchema>

export const clientsSearchRegistry: ToolDefinition<
  ClientsSearchInput,
  ClientsSearchOutput
> = {
  name: 'clients_search',
  label: 'Search Clients',
  description: 'Search for clients by phone number on Petbooqz',
  inputSchema: ClientsSearchInputSchema,
  outputSchema: ClientsSearchOutputSchema,
  handler: async (input, context) => {
    const apiClient = createClientFromEnv(context.env)
    // Strip "+" character from phone number before searching
    const phoneNumber = input.phone.replace(/\+/g, '')
    const clients = await apiClient.get<ClientSearchResult[]>(
      '/clients/search',
      { phone: phoneNumber }
    )

    return {
      output: {
        clients: Array.isArray(clients) ? clients : [clients],
      },
      billing: {
        credits: 0,
      },
    }
  },
}
