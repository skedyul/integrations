import { z } from 'zod'
import type { ToolDefinition } from 'skedyul'
import { PetbooqzApiClient } from '../lib/api-client'

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
  name: 'clients.get',
  description: 'Get client information by ID',
  inputs: ClientsGetInputSchema,
  outputSchema: ClientsGetOutputSchema,
  handler: async ({ input, context }) => {
  const baseUrl = context.env.PETBOOQZ_BASE_URL
  const username = context.env.PETBOOQZ_USERNAME
  const password = context.env.PETBOOQZ_PASSWORD

  if (!baseUrl || !username || !password) {
    throw new Error(
      'Missing required environment variables: PETBOOQZ_BASE_URL, PETBOOQZ_USERNAME, PETBOOQZ_PASSWORD',
    )
  }

  const client = new PetbooqzApiClient({ baseUrl, username, password })
  const clientData = await client.get<Client>(`/clients/${input.client_id}`)

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

