import { z, type ToolDefinition, instance, createSuccessResponse, createExternalError } from 'skedyul'

const UpdateBusinessDetailsInputSchema = z.object({
  name: z.string().optional().describe('Business name'),
  club_id: z.string().optional().describe('Club ID'),
  address: z.string().optional().describe('Business address'),
  phone: z.string().optional().describe('Phone number'),
  email: z.string().optional().describe('Email address'),
  website_url: z.string().optional().describe('Website URL'),
})

const UpdateBusinessDetailsOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
})

type UpdateBusinessDetailsInput = z.infer<typeof UpdateBusinessDetailsInputSchema>
type UpdateBusinessDetailsOutput = z.infer<typeof UpdateBusinessDetailsOutputSchema>

export const updateBusinessDetailsRegistry: ToolDefinition<
  UpdateBusinessDetailsInput,
  UpdateBusinessDetailsOutput
> = {
  name: 'update_business_details',
  label: 'Update Business Details',
  description: 'Updates business contact information in the BusinessDetails model',
  inputSchema: UpdateBusinessDetailsInputSchema,
  outputSchema: UpdateBusinessDetailsOutputSchema,
  timeout: 300000,
  handler: async (input, context) => {
    try {
      const { data: records } = await instance.list('business_details', {
        page: 1,
        limit: 1,
      })

      if (records.length === 0) {
        await instance.create('business_details', {
          name: input.name || '',
          club_id: input.club_id || null,
          address: input.address || null,
          phone: input.phone || null,
          email: input.email || null,
          website_url: input.website_url || null,
        })

        return createSuccessResponse({
          success: true,
          message: 'Business details created successfully',
        })
      }

      const existingRecord = records[0]
      const updateData: Record<string, string | null> = {}

      if (input.name !== undefined) updateData.name = input.name
      if (input.club_id !== undefined) updateData.club_id = input.club_id || null
      if (input.address !== undefined) updateData.address = input.address || null
      if (input.phone !== undefined) updateData.phone = input.phone || null
      if (input.email !== undefined) updateData.email = input.email || null
      if (input.website_url !== undefined) updateData.website_url = input.website_url || null

      await instance.update('business_details', existingRecord.id, updateData)

      return createSuccessResponse({
        success: true,
        message: 'Business details updated successfully',
      })
    } catch (error) {
      return createExternalError(
        'BFT',
        error instanceof Error ? error.message : 'Failed to update business details',
      )
    }
  },
}
