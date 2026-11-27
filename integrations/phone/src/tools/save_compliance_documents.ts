import skedyul, { type z as ZodType, isRuntimeContext } from 'skedyul'
import type { ToolDefinition } from 'skedyul'
import { saveComplianceStep } from '../lib/compliance_record'
import { createSuccessResponse, createValidationError } from '../lib/response'
import { ADDRESS_PROOF_DOCUMENT_TYPES } from '../lib/compliance_submission'

const { z } = skedyul

const InputSchema = z.object({
  file: z.string().optional().describe('File ID of the registration document'),
  address_proof_type: z.enum(ADDRESS_PROOF_DOCUMENT_TYPES).describe('Proof of address type'),
  address_proof: z.string().optional().describe('File ID of the proof of address'),
})

const OutputSchema = z.object({ status: z.string(), message: z.string().optional() })

type Input = ZodType.infer<typeof InputSchema>
type Output = ZodType.infer<typeof OutputSchema>

/** Saves the supporting documents step of compliance: a registration document and a proof of address. Files left out are kept. */
export const saveComplianceDocumentsRegistry: ToolDefinition<Input, Output> = {
  name: 'save_compliance_documents',
  label: 'Supporting documents',
  description: 'Saves the supporting documents step of compliance: a registration document and a proof of address. Files left out are kept.',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async (input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }
    const result = await saveComplianceStep({
      file: input.file || undefined,
      address_proof_type: input.address_proof_type,
      address_proof: input.address_proof || undefined,
    })
    if (!result.ok) return createValidationError(result.message)
    return createSuccessResponse({ status: 'saved', message: 'Supporting documents: saved' })
  },
}
