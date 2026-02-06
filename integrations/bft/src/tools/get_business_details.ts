import { z, type ToolDefinition, instance } from 'skedyul'
import { createToolResponse } from '../lib/response'

const GetBusinessDetailsInputSchema = z.object({})

const GetBusinessDetailsOutputSchema = z.object({
  businessDetails: z.object({
    id: z.string(),
    name: z.string(),
    clubId: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    websiteUrl: z.string().optional(),
  }),
})

type GetBusinessDetailsInput = z.infer<typeof GetBusinessDetailsInputSchema>
type GetBusinessDetailsOutput = z.infer<typeof GetBusinessDetailsOutputSchema>

export const getBusinessDetailsRegistry: ToolDefinition<
  GetBusinessDetailsInput,
  GetBusinessDetailsOutput
> = {
  name: 'get_business_details',
  label: 'Get Business Details',
  description: 'Returns business contact information from the BusinessDetails model',
  inputSchema: GetBusinessDetailsInputSchema,
  outputSchema: GetBusinessDetailsOutputSchema,
  handler: async (input, context) => {
    try {
      const { data: records } = await instance.list('business_details', {
        page: 1,
        limit: 1,
      })

      if (records.length === 0) {
        return createToolResponse<GetBusinessDetailsOutput>('get_business_details', {
          success: false,
          error: 'Business details not found. Please run refresh_data first.',
        })
      }

      const businessDetails = records[0]

      return createToolResponse('get_business_details', {
        success: true,
        data: {
          businessDetails: {
            id: businessDetails.id,
            name: (businessDetails.name as string) || '',
            clubId: (businessDetails.club_id as string) || undefined,
            address: (businessDetails.address as string) || undefined,
            phone: (businessDetails.phone as string) || undefined,
            email: (businessDetails.email as string) || undefined,
            websiteUrl: (businessDetails.website_url as string) || undefined,
          },
        },
        message: 'Business details retrieved successfully',
      })
    } catch (error) {
      return createToolResponse<GetBusinessDetailsOutput>('get_business_details', {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve business details',
      })
    }
  },
}
