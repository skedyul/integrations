import { z, type ToolDefinition } from 'skedyul'
import { createClientFromEnv } from '../lib/api_client'
import { createToolResponse } from '../lib/response'
import { isPetbooqzError, getErrorMessage, type PetbooqzErrorResponse } from '../lib/types'

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

const ClientSchema = z.object({
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
})

const ClientsGetInputSchema = z.object({
  client_id: z.string(),
})

const ClientsGetOutputSchema = z.object({
  client: ClientSchema,
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
    
    try {
      const response = await apiClient.get<Client | PetbooqzErrorResponse>(
        `/clients/${input.client_id}`,
        undefined,
        'Vetstoria/v2',
      )

      if (isPetbooqzError(response)) {
        return createToolResponse<ClientsGetOutput>('clients_get', {
          success: false,
          error: getErrorMessage(response),
        })
      }

      return createToolResponse('clients_get', {
        success: true,
        data: { client: response },
        message: `Client ${response.first_name} ${response.last_name} retrieved`,
      })
    } catch (error) {
      return createToolResponse<ClientsGetOutput>('clients_get', {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get client',
      })
    }
  },
}
