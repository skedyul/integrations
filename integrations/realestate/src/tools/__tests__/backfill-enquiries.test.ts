import { describe, expect, it, beforeEach, jest } from '@jest/globals'

const schema = {
  optional() {
    return this
  },
  describe() {
    return this
  },
  transform() {
    return this
  },
}

jest.unstable_mockModule('skedyul', () => ({
  z: {
    object: () => schema,
    string: () => schema,
    number: () => schema,
    array: () => schema,
    enum: () => schema,
    boolean: () => schema,
    union: () => schema,
    coerce: {
      number() {
        return schema
      },
    },
  },
  createSuccessResponse: (output: unknown) => ({ success: true, output }),
  createValidationError: (message: string) => ({
    success: false,
    error: { code: 'VALIDATION_ERROR', message },
  }),
  createExternalError: (service: string, message: string) => ({
    success: false,
    error: {
      code: 'EXTERNAL_SERVICE_ERROR',
      message: `${service}: ${message}`,
      category: 'external',
    },
  }),
}))

const backfillReaEnquiries = jest.fn()

jest.unstable_mockModule('../../lib/backfill-enquiries', () => ({
  BACKFILL_DEFAULT_LIMIT: 200,
  backfillReaEnquiries,
}))

const { backfillEnquiriesRegistry } = await import('../backfill-enquiries')

describe('backfill_enquiries tool', () => {
  beforeEach(() => {
    backfillReaEnquiries.mockReset()
  })

  it('requires since', async () => {
    const result = await backfillEnquiriesRegistry.handler(
      {} as never,
      { env: { REA_CLIENT_ID: 'id', REA_CLIENT_SECRET: 'secret' } } as never,
    )
    expect(result.success).toBe(false)
    if (result.success) throw new Error('expected failure')
    expect(result.error.message).toMatch(/since/)
  })

  it('returns the backfill result', async () => {
    backfillReaEnquiries.mockResolvedValue({
      status: 'dry_run',
      dry_run: true,
      found: 1,
      message: 'Dry run',
    })

    const result = await backfillEnquiriesRegistry.handler(
      { since: '2026-09-04T00:14:00Z' },
      { env: { REA_CLIENT_ID: 'id', REA_CLIENT_SECRET: 'secret' } } as never,
    )

    expect(result.success).toBe(true)
    if (!result.success) throw new Error(result.error.message)
    expect(result.output.status).toBe('dry_run')
    expect(backfillReaEnquiries).toHaveBeenCalled()
  })
})
