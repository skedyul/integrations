import { z, type ToolDefinition } from 'skedyul'
import { createClientFromEnv } from '../lib/api_client'
import { createToolResponse } from '../lib/response'
import { isPetbooqzError, getErrorMessage, type PetbooqzErrorResponse } from '../lib/types'

export interface PetbooqzPatient {
  patient_id: string
  patientname: string
  dob?: string
  sex?: string
  breed?: string
  desexed?: string
  species?: string
  microchip?: string
  [key: string]: unknown
}

export interface PetbooqzClient {
  client_id: string
  active?: boolean
  address?: string
  city?: string
  postcode?: string
  state?: string
  title?: string
  firstname?: string
  lastname?: string
  contacttype?: string
  mobile?: string
  phone?: string
  email?: string
  company?: string
  patients?: PetbooqzPatient[]
  [key: string]: unknown
}

const PetbooqzPatientSchema = z.object({
  patient_id: z.string(),
  patientname: z.string(),
  dob: z.string().optional(),
  sex: z.string().optional(),
  breed: z.string().optional(),
  desexed: z.string().optional(),
  species: z.string().optional(),
  microchip: z.string().optional(),
}).passthrough()

const PetbooqzClientSchema = z.object({
  client_id: z.string(),
  active: z.boolean().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  state: z.string().optional(),
  title: z.string().optional(),
  firstname: z.string().optional(),
  lastname: z.string().optional(),
  contacttype: z.string().optional(),
  mobile: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  company: z.string().optional(),
  patients: z.array(PetbooqzPatientSchema).optional(),
}).passthrough()

const ClientSearchResultSchema = z.object({
  client: PetbooqzClientSchema,
}).passthrough()

type ClientSearchResult = z.infer<typeof ClientSearchResultSchema>

const ClientsSearchInputSchema = z.object({
  phone: z.string().describe('Mobile phone number (e.g., 0456789123 or 61456789123)'),
})

const ClientsSearchOutputSchema = z.object({
  clients: z.array(ClientSearchResultSchema),
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
    
    try {
      // Strip "+" character from phone number before searching
      const phoneNumber = input.phone.replace(/\+/g, '')
      const response = await apiClient.get<ClientSearchResult | ClientSearchResult[] | PetbooqzErrorResponse>(
        '/clients/search',
        { phone: phoneNumber },
      )

      console.log('response', response)

      if (isPetbooqzError(response)) {
        const message = getErrorMessage(response)
        if (message.toLowerCase() === 'no client found') {
          return createToolResponse('clients_search', {
            success: true,
            data: { clients: [] },
            message: `Found 0 clients matching phone ${phoneNumber}`,
          })
        }
        return createToolResponse<ClientsSearchOutput>('clients_search', {
          success: false,
          error: message,
        })
      }

      const clients = Array.isArray(response) ? response : [response]

      return createToolResponse('clients_search', {
        success: true,
        data: { clients },
        message: `Found ${clients.length} client${clients.length !== 1 ? 's' : ''} matching phone ${phoneNumber}`,
      })
    } catch (error) {
      return createToolResponse<ClientsSearchOutput>('clients_search', {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search clients',
      })
    }
  },
}
