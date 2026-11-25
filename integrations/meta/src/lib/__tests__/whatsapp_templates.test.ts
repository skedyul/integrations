import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildCreateTemplateBody,
  buildTemplateMessage,
  mapMetaTemplateStatus,
  readTemplateStatusUpdate,
} from '../whatsapp_templates.ts'

describe('buildCreateTemplateBody', () => {
  it('builds a named-parameter template with examples', () => {
    assert.deepEqual(
      buildCreateTemplateBody({
        name: 'skd_campaign_x',
        language: 'en',
        category: 'marketing',
        body: 'Hi {{first_name}}, see you at {{time}}.',
        parameters: [
          { name: 'first_name', example: 'Sam' },
          { name: 'time', example: '9am' },
        ],
      }),
      {
        name: 'skd_campaign_x',
        language: 'en',
        category: 'MARKETING',
        parameter_format: 'NAMED',
        components: [
          {
            type: 'BODY',
            text: 'Hi {{first_name}}, see you at {{time}}.',
            example: {
              body_text_named_params: [
                { param_name: 'first_name', example: 'Sam' },
                { param_name: 'time', example: '9am' },
              ],
            },
          },
        ],
      },
    )
  })

  it('builds a plain utility template without parameters', () => {
    assert.deepEqual(
      buildCreateTemplateBody({
        name: 'skd_msg_x',
        language: 'en',
        category: 'utility',
        body: 'Your booking is confirmed.',
        footer: 'Reply STOP to opt out',
      }),
      {
        name: 'skd_msg_x',
        language: 'en',
        category: 'UTILITY',
        components: [
          { type: 'BODY', text: 'Your booking is confirmed.' },
          { type: 'FOOTER', text: 'Reply STOP to opt out' },
        ],
      },
    )
  })
})

describe('buildTemplateMessage', () => {
  it('sends named body parameters', () => {
    assert.deepEqual(
      buildTemplateMessage({ name: 'skd_x', language: 'en', parameters: { first_name: 'Sam' } }),
      {
        name: 'skd_x',
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [{ type: 'text', parameter_name: 'first_name', text: 'Sam' }],
          },
        ],
      },
    )
  })

  it('omits components without parameters', () => {
    assert.deepEqual(buildTemplateMessage({ name: 'skd_x', language: 'en' }), {
      name: 'skd_x',
      language: { code: 'en' },
    })
  })
})

describe('template status mapping', () => {
  it('maps Meta statuses to platform statuses', () => {
    assert.equal(mapMetaTemplateStatus('APPROVED'), 'approved')
    assert.equal(mapMetaTemplateStatus('REINSTATED'), 'approved')
    assert.equal(mapMetaTemplateStatus('REJECTED'), 'rejected')
    assert.equal(mapMetaTemplateStatus('PAUSED'), 'paused')
    assert.equal(mapMetaTemplateStatus('DISABLED'), 'disabled')
    assert.equal(mapMetaTemplateStatus('PENDING'), 'pending')
    assert.equal(mapMetaTemplateStatus('PENDING_DELETION'), null)
  })

  it('reads a status webhook, ignoring NONE as a reason', () => {
    assert.deepEqual(
      readTemplateStatusUpdate({
        event: 'REJECTED',
        message_template_id: 1234567890,
        reason: 'INVALID_FORMAT',
      }),
      { templateId: '1234567890', status: 'rejected', reason: 'INVALID_FORMAT' },
    )
    assert.deepEqual(
      readTemplateStatusUpdate({ event: 'APPROVED', message_template_id: '42', reason: 'NONE' }),
      { templateId: '42', status: 'approved' },
    )
    assert.equal(readTemplateStatusUpdate({ event: 'DELETED', message_template_id: '42' }), null)
    assert.equal(readTemplateStatusUpdate(undefined), null)
  })
})
