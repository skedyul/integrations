import { z, type ToolDefinition, type ProfileBlock, createSuccessResponse, createExternalError } from 'skedyul'
import { createClientFromEnv } from '../lib/api_client'
import { isPetbooqzError, getErrorMessage, type PetbooqzErrorResponse } from '../lib/types'

function getInitials(name: string | undefined): string {
  if (!name) return '??'
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) {
    return (words[0]?.[0] || '') + (words[1]?.[0] || '')
  }
  return name.slice(0, 2).toUpperCase()
}

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
      const phoneNumber = input.phone.replace(/\+/g, '')
      const response = await apiClient.get<ClientSearchResult | ClientSearchResult[] | PetbooqzErrorResponse>(
        '/clients/search',
        { phone: phoneNumber },
      )

      console.log('response', response)

      if (isPetbooqzError(response)) {
        const message = getErrorMessage(response)
        if (message.toLowerCase() === 'no client found') {
          return createSuccessResponse({ clients: [] })
        }
        return createExternalError('Petbooqz', message)
      }

      const clients = Array.isArray(response) ? response : [response]

      // Build ProfileBlock for the first client found
      const dataBlocks: ProfileBlock[] = []
      const firstClient = clients[0]?.client
      if (firstClient) {
        const fullName = [firstClient.firstname, firstClient.lastname]
          .filter(Boolean)
          .join(' ')
        const pets =
          firstClient.patients?.map((p) => p.patientname).join(', ') || 'No pets'

        const fields: Array<{ label: string; value: string }> = []
        if (firstClient.mobile || firstClient.phone) {
          fields.push({ label: 'Phone', value: firstClient.mobile || firstClient.phone || '' })
        }
        if (firstClient.email) {
          fields.push({ label: 'Email', value: firstClient.email })
        }
        if (firstClient.patients && firstClient.patients.length > 0) {
          fields.push({ label: 'Pets', value: pets })
        }
        const address = [firstClient.address, firstClient.city, firstClient.state]
          .filter(Boolean)
          .join(', ')
        if (address) {
          fields.push({ label: 'Address', value: address })
        }

        dataBlocks.push({
          type: 'profile',
          title: fullName || 'Client',
          subtitle: pets !== 'No pets' ? pets : undefined,
          avatar: {
            initials: getInitials(fullName),
          },
          fields,
        })
      }

      return createSuccessResponse({ clients }, { dataBlocks })
    } catch (error) {
      return createExternalError(
        'Petbooqz',
        error instanceof Error ? error.message : 'Failed to search clients',
      )
    }
  },
}
