import skedyul, { type z as ZodType, isRuntimeContext } from 'skedyul'
import type { ToolDefinition } from 'skedyul'
import { saveComplianceStep } from '../lib/compliance_record'
import { createSuccessResponse, createValidationError } from '../lib/response'

const { z } = skedyul

const InputSchema = z.object({
  business_name: z.string().min(1).describe('Legal name of the business'),
  business_id: z.string().min(1).describe('Business registration or tax ID number (e.g. ABN, EIN)'),
  business_email: z.string().email().describe('Email for compliance updates'),
  country: z.string().length(2).describe('ISO 2-letter country code'),
})

const OutputSchema = z.object({ status: z.string(), message: z.string().optional() })

type Input = ZodType.infer<typeof InputSchema>
type Output = ZodType.infer<typeof OutputSchema>

/** Saves the business details step of compliance: legal name, business ID, email and country. */
export const saveComplianceBusinessRegistry: ToolDefinition<Input, Output> = {
  name: 'save_compliance_business',
  label: 'Business details',
  description: 'Saves the business details step of compliance: legal name, business ID, email and country.',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async (input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }
    const result = await saveComplianceStep({
      business_name: input.business_name.trim(),
      business_id: input.business_id.trim(),
      business_email: input.business_email.trim(),
      country: input.country.toUpperCase(),
    })
    if (!result.ok) return createValidationError(result.message)
    return createSuccessResponse({ status: 'saved', message: 'Business details: saved' })
  },
}
