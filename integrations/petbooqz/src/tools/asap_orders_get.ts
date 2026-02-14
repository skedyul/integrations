import { z, type ToolDefinition } from 'skedyul'
import { createClientFromEnv } from '../lib/api_client'
import { createToolResponse } from '../lib/response'
import { isPetbooqzError, getErrorMessage, type PetbooqzErrorResponse } from '../lib/types'

export interface AsapOrder {
  order_id: string
  client_id: string
  patient_id: string
  order_date: string
  order_status: string
  order_type: string
  notes: string
}

const AsapOrderSchema = z.object({
  order_id: z.string(),
  client_id: z.string(),
  patient_id: z.string(),
  order_date: z.string(),
  order_status: z.string(),
  order_type: z.string(),
  notes: z.string(),
})

const AsapOrdersGetInputSchema = z.object({
  order_id: z.string().describe('The unique identifier of the ASAP order'),
})

const AsapOrdersGetOutputSchema = z.object({
  order: AsapOrderSchema,
})

type AsapOrdersGetInput = z.infer<typeof AsapOrdersGetInputSchema>
type AsapOrdersGetOutput = z.infer<typeof AsapOrdersGetOutputSchema>

export const asapOrdersGetRegistry: ToolDefinition<
  AsapOrdersGetInput,
  AsapOrdersGetOutput
> = {
  name: 'asap_orders_get',
  label: 'Get ASAP Order',
  description: 'Get ASAP order information by ID from Petbooqz',
  inputSchema: AsapOrdersGetInputSchema,
  outputSchema: AsapOrdersGetOutputSchema,
  handler: async (input, context) => {
    const apiClient = createClientFromEnv(context.env)

    try {
      const response = await apiClient.get<AsapOrder | PetbooqzErrorResponse>(
        `/asapOrder/${input.order_id}`,
        undefined,
        'Skedyul/v1',
      )

      if (isPetbooqzError(response)) {
        return createToolResponse<AsapOrdersGetOutput>('asap_orders_get', {
          success: false,
          error: getErrorMessage(response),
        })
      }

      return createToolResponse('asap_orders_get', {
        success: true,
        data: { order: response },
        message: `ASAP order ${response.order_id} retrieved`,
      })
    } catch (error) {
      return createToolResponse<AsapOrdersGetOutput>('asap_orders_get', {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get ASAP order',
      })
    }
  },
}
