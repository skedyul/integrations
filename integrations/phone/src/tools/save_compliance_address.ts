import skedyul, { type z as ZodType, isRuntimeContext } from 'skedyul'
import type { ToolDefinition } from 'skedyul'
import { saveComplianceStep } from '../lib/compliance_record'
import { createSuccessResponse, createValidationError } from '../lib/response'

const { z } = skedyul

const InputSchema = z.object({
  address: z.string().min(5).describe('Full business address, e.g. 123 Main St, Sydney NSW 2000'),
})

const OutputSchema = z.object({ status: z.string(), message: z.string().optional() })

type Input = ZodType.infer<typeof InputSchema>
type Output = ZodType.infer<typeof OutputSchema>

/** Saves the business address step of compliance. */
export const saveComplianceAddressRegistry: ToolDefinition<Input, Output> = {
  name: 'save_compliance_address',
  label: 'Business address',
  description: 'Saves the business address step of compliance.',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async (input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }
    const result = await saveComplianceStep({ address: input.address.trim() })
    if (!result.ok) return createValidationError(result.message)
    return createSuccessResponse({ status: 'saved', message: 'Business address: saved' })
  },
}
