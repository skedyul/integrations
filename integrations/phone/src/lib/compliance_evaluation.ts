/**
 * Twilio bundle evaluation results. Field names match the Regulatory
 * Compliance Evaluations API (`failure_reason`, `passed`, `invalid`).
 */
export type EvaluationFailureField = {
  failure_reason?: string | null
  friendly_name?: string | null
}

export type EvaluationResultItem = {
  passed?: boolean
  failure_reason?: string | null
  friendly_name?: string | null
  invalid?: EvaluationFailureField[] | null
}

export type BundleEvaluationPayload = {
  status?: string | null
  results?: unknown
}

const REUSABLE_BUNDLE_STATUSES = new Set(['draft', 'twilio-rejected'])

/** A draft or rejected bundle can take a new proof file. In-review bundles cannot. */
export function isReusableBundleStatus(status: string | null | undefined): boolean {
  return typeof status === 'string' && REUSABLE_BUNDLE_STATUSES.has(status)
}

function pushReason(reasons: string[], value: string | null | undefined) {
  const reason = value?.trim()
  if (reason) reasons.push(reason)
}

/**
 * Reasons that block submission. A compliant evaluation has none.
 * A missing commercial-register file shows up here as a failed result.
 */
export function collectEvaluationFailures(evaluation: BundleEvaluationPayload): string[] {
  if (evaluation.status === 'compliant') return []

  const reasons: string[] = []
  const results = Array.isArray(evaluation.results)
    ? evaluation.results.filter(
        (item): item is EvaluationResultItem => !!item && typeof item === 'object',
      )
    : []
  for (const result of results) {
    if (result.passed) continue
    pushReason(reasons, result.failure_reason)
    const invalid = Array.isArray(result.invalid) ? result.invalid : []
    for (const field of invalid) {
      pushReason(reasons, field.failure_reason)
    }
  }

  if (reasons.length === 0) {
    reasons.push(
      'The compliance bundle is missing the commercial register excerpt and cannot be submitted.',
    )
  }
  return reasons
}
