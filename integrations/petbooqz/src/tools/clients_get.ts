import { z, type ToolDefinition } from 'skedyul'
import { createClientFromEnv } from '../lib/api_client'

export interface Client {
  title: string
  first_name: string
  last_name: string
  email_address: string
  mobile_number: string
  landline_number: string
  address_1: string
  city: string
  state: string
  preferred_brance_id: string
  is_active: string
}

const ClientsGetInputSchema = z.object({
  client_id: z.string(),
})

const ClientsGetOutputSchema = z.object({
  client: z.object({
    title: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    email_address: z.string(),
    mobile_number: z.string(),
    landline_number: z.string(),
    address_1: z.string(),
    city: z.string(),
    state: z.string(),
    preferred_brance_id: z.string(),
    is_active: z.string(),
  }),
})

type ClientsGetInput = z.infer<typeof ClientsGetInputSchema>
type ClientsGetOutput = z.infer<typeof ClientsGetOutputSchema>

export const clientsGetRegistry: ToolDefinition<
  ClientsGetInput,
  ClientsGetOutput
> = {
  name: 'clients_get',
  label: 'Get Client',
  description: 'Get client information by ID on Petbooqz',
  inputSchema: ClientsGetInputSchema,
  outputSchema: ClientsGetOutputSchema,
  handler: async (input, context) => {
    const apiClient = createClientFromEnv(context.env)
    const clientData = await apiClient.get<Client>(`/clients/${input.client_id}`)

    return {
      output: {
        client: clientData,
      },
      billing: {
        credits: 0,
      },
    }
  },
}
