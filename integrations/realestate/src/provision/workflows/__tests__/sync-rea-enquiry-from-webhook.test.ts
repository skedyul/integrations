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
    expect(yaml).toContain(
      '"ownership_key": {{ ownership_left | append: \':\' | append: contact_id | json }}',
    )
    expect(yaml).toContain(
      '{%- assign ownership_left = listing_id | default: property_id -%}',
    )
    expect(yaml).not.toContain('"listing_address": {{ inputs.data.enquiry.listing_address | json }}')
  })

  it('builds ownership with a property_id fallback when listing_id is missing', () => {
    expect(yaml).toContain(
      '{%- assign ownership_left = listing_id | default: property_id -%}',
    )
    expect(yaml).toContain(
      '"ownership_key": {{ ownership_left | append: \':\' | append: contact_id | json }}',
    )
    expect(yaml).not.toContain(
      'listing_id != blank and contact_id != blank',
    )
  })

  it('skips ownership payload when customer, property, or contact is missing', () => {
    expect(yaml).toContain(
      "steps.upsert-customer.outputs.response.results[0].instanceId != blank",
    )
    expect(yaml).toContain(
      "steps.upsert-property.outputs.response.results[0].instanceId != blank",
    )
    expect(yaml).toContain(
      "{% assign contact_id = inputs.data.enquiry.phone | default: inputs.data.enquiry.email %}",
    )
    expect(yaml).toContain(
      "{% if 'model_handle' | realestate: 'present', 'property_ownership' %}",
    )
    expect(yaml).toContain(
      'and contact_id != blank %}true{% else %}false{% endif %}{% else %}false{% endif %}',
    )
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
