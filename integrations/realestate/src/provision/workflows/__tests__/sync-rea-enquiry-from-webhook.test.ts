import { describe, expect, it } from '@jest/globals'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const yamlPath = join(
  process.cwd(),
  'workflows/sync-rea-enquiry-from-webhook.yml',
)

describe('sync-rea-enquiry-from-webhook', () => {
  const yaml = readFileSync(yamlPath, 'utf8')

  it('does not keep a flattened lead upsert path', () => {
    expect(yaml).not.toContain('sync-rea-lead')
    expect(yaml).not.toContain("'model_handle' | realestate: 'present', 'lead'")
    expect(yaml).not.toContain('realestate: "format", "lead"')
  })

  it('splits the flattened enquiry into customer, property, ownership, and enquiry upserts', () => {
    expect(yaml).toContain('realestate: "format", "customer"')
    expect(yaml).toContain('realestate: "format", "property"')
    expect(yaml).toContain('realestate: "format", "property_ownership"')
    expect(yaml).toContain('realestate: "format", "enquiry"')
    expect(yaml).toContain('"listing_id": {{ inputs.data.enquiry.listing_id | json }}')
    expect(yaml).toContain('"address": {{ inputs.data.enquiry.listing_address | json }}')
    expect(yaml).toContain('"rea_enquiry_id": {{ inputs.data.enquiry.rea_enquiry_id | json }}')
    expect(yaml).toContain('"ownership_key": {{ listing_id | append: \':\' | append: contact_id | json }}')
    expect(yaml).not.toContain('"listing_address": {{ inputs.data.enquiry.listing_address | json }}')
  })

  it('associates the conversation contact with the customer instance only', () => {
    expect(yaml).toContain(
      'steps.upsert-customer.outputs.response.results[0].instanceId',
    )
    expect(yaml).toContain('cmd: contact.create')
    expect(yaml).toContain('cmd: contact.resolve')
    expect(yaml).not.toContain('sync-lead')
  })

  it('skips each fan-out step when that entity map is missing', () => {
    expect(yaml).toContain("'model_handle' | realestate: 'present', 'customer'")
    expect(yaml).toContain("'model_handle' | realestate: 'present', 'property'")
    expect(yaml).toContain("'model_handle' | realestate: 'present', 'property_ownership'")
    expect(yaml).toContain("'model_handle' | realestate: 'present', 'enquiry'")
  })
})
