import skedyul, { type z as ZodType, isRuntimeContext } from 'skedyul'
import type { ToolDefinition } from 'skedyul'
import { getComplianceRecord } from '../lib/compliance_record'
import { ADDRESS_PROOF_DOCUMENT_TYPES, type AddressProofDocumentType } from '../lib/compliance_submission'
import { createValidationError } from '../lib/response'
import { submitComplianceDocumentRegistry } from './submit_compliance_document'

const { z } = skedyul

const InputSchema = z.object({})
const OutputSchema = z.record(z.string(), z.unknown())

type Input = ZodType.infer<typeof InputSchema>
type Output = ZodType.infer<typeof OutputSchema>

/** A stored value as text (select fields can come back as `{ value }`). */
function text(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (value && typeof value === 'object' && typeof (value as { value?: unknown }).value === 'string') {
    return (value as { value: string }).value
  }
  return undefined
}

/**
 * Submits the saved compliance steps (business details, address, documents)
 * to the carrier for review. Uses the same submission as
 * `submit_compliance_document`, so a rejected review is resubmitted the same
 * way once the steps are fixed.
 */
export const submitComplianceForReviewRegistry: ToolDefinition<Input, Output> = {
  name: 'submit_compliance_for_review',
  label: 'Submit compliance for review',
  description: 'Submits the saved business details, address and documents to the carrier for review.',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async (_input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }
    const record = await getComplianceRecord()
    const proofType = text(record?.address_proof_type)
    const values = {
      business_name: text(record?.business_name),
      business_email: text(record?.business_email),
      business_id: text(record?.business_id),
      country: text(record?.country),
      address: text(record?.address),
      file: text(record?.file),
      address_proof: text(record?.address_proof),
    }
    const missing = [
      !values.business_name || !values.business_email || !values.business_id || !values.country
        ? 'business details'
        : null,
      !values.address ? 'business address' : null,
      !values.file || !values.address_proof || !proofType ? 'supporting documents' : null,
    ].filter(Boolean)
    if (missing.length > 0) {
      return createValidationError(`Finish these steps first: ${missing.join(', ')}.`)
    }
    if (!ADDRESS_PROOF_DOCUMENT_TYPES.includes(proofType as AddressProofDocumentType)) {
      return createValidationError('Choose a proof of address type in Supporting documents.')
    }
    return submitComplianceDocumentRegistry.handler(
      {
        business_name: values.business_name!,
        business_email: values.business_email!,
        business_id: values.business_id!,
        country: values.country!,
        address: values.address!,
        file: values.file!,
        address_proof: values.address_proof!,
        address_proof_type: proofType as AddressProofDocumentType,
      },
      context,
    ) as ReturnType<ToolDefinition<Input, Output>['handler']>
  },
}
