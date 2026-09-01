import { describe, expect, it } from '@jest/globals'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const yamlPath = join(
  process.cwd(),
  'workflows/sync-rea-enquiry-from-webhook.yml',
)
const leadYamlPath = join(process.cwd(), 'workflows/sync-rea-lead.yml')

describe('sync-rea-enquiry-from-webhook', () => {
  const yaml = readFileSync(yamlPath, 'utf8')
  const leadYaml = readFileSync(leadYamlPath, 'utf8')

  it('keeps the legacy lead path when only the lead CRM map is present', () => {
    expect(yaml).toContain('run: "@realestate/sync-rea-lead"')
    expect(yaml).toContain("'model_handle' | realestate: 'present', 'lead'")
    expect(leadYaml).toContain("'model_handle' | realestate: 'present', 'lead'")
    expect(leadYaml).toContain('realestate: "format", "lead"')
  })

  it('splits the flattened enquiry into customer, property, and enquiry upserts', () => {
    expect(yaml).toContain('realestate: "format", "customer"')
    expect(yaml).toContain('realestate: "format", "property"')
    expect(yaml).toContain('realestate: "format", "enquiry"')
    expect(yaml).toContain('"listing_id": {{ inputs.data.enquiry.listing_id | json }}')
    expect(yaml).toContain('"address": {{ inputs.data.enquiry.listing_address | json }}')
    expect(yaml).toContain('"rea_enquiry_id": {{ inputs.data.enquiry.rea_enquiry_id | json }}')
    expect(yaml).not.toContain('"listing_address": {{ inputs.data.enquiry.listing_address | json }}')
  })

  it('associates the conversation contact with the customer instance', () => {
    expect(yaml).toContain(
      'steps.upsert-customer.outputs.response.results[0].instanceId',
    )
    expect(yaml).toContain('cmd: contact.create')
    expect(yaml).toContain('cmd: contact.resolve')
  })

  it('skips each fan-out step when that entity map is missing', () => {
    expect(yaml).toContain("'model_handle' | realestate: 'present', 'customer'")
    expect(yaml).toContain("'model_handle' | realestate: 'present', 'property'")
    expect(yaml).toContain("'model_handle' | realestate: 'present', 'enquiry'")
  })
})
