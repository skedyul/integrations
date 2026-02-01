import skedyul, { type z as ZodType } from 'skedyul'
import type { ToolDefinition } from 'skedyul'

const { z, instance } = skedyul

/**
 * Input schema for updating email address details.
 */
const UpdateEmailAddressInputSchema = z.object({
  email_address_id: z.string().describe('ID of the email address to update'),
  name: z.string().optional().describe('Display name for outgoing emails'),
})

const UpdateEmailAddressOutputSchema = z.object({
  success: z.boolean(),
  email: z.string(),
})

type UpdateEmailAddressInput = ZodType.infer<typeof UpdateEmailAddressInputSchema>
type UpdateEmailAddressOutput = ZodType.infer<typeof UpdateEmailAddressOutputSchema>

export const updateEmailAddressRegistry: ToolDefinition<
  UpdateEmailAddressInput,
  UpdateEmailAddressOutput
> = {
  name: 'update_email_address',
  description: 'Update email address display name',
  inputSchema: UpdateEmailAddressInputSchema,
  outputSchema: UpdateEmailAddressOutputSchema,
  handler: async (input) => {
    const updateData: Record<string, unknown> = {}
    
    if (input.name !== undefined) {
      updateData.name = input.name
    }

    const updated = await instance.update('email_address', input.email_address_id, updateData)

    return {
      output: {
        success: true,
        email: (updated as { email: string }).email,
      },
    }
  },
}
