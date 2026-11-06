import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { subscribePageFields } from '../page_subscriptions.ts'
import { missingMessagingAssetsError } from '../oauth_assets.ts'

describe('subscribePageFields', () => {
  it('subscribes messaging and leadgen in one call', async () => {
    const calls: string[][] = []
    const result = await subscribePageFields(async (fields) => {
      calls.push(fields)
    })

    assert.deepEqual(calls, [['messages', 'messaging_postbacks', 'message_reads', 'leadgen']])
    assert.equal(result.leadgen, true)
    assert.equal(result.leadgenError, undefined)
  })

  it('keeps messaging when leadgen is not permitted', async () => {
    const calls: string[][] = []
    const result = await subscribePageFields(async (fields) => {
      calls.push(fields)
      if (fields.includes('leadgen')) {
        throw new Error('(#200) Requires leads_retrieval permission')
      }
    })

    assert.deepEqual(calls[1], ['messages', 'messaging_postbacks', 'message_reads'])
    assert.equal(result.leadgen, false)
    assert.match(result.leadgenError ?? '', /leads_retrieval/)
  })

  it('throws when messaging alone also fails', async () => {
    await assert.rejects(
      subscribePageFields(async () => {
        throw new Error('page token expired')
      }),
      /page token expired/,
    )
  })
})

describe('missingMessagingAssetsError', () => {
  it('lets a Messenger-only or Instagram-only login connect', () => {
    assert.equal(
      missingMessagingAssetsError({ wabaCount: 0, pageCount: 1, instagramAccountCount: 0 }),
      null,
    )
    assert.equal(
      missingMessagingAssetsError({ wabaCount: 0, pageCount: 0, instagramAccountCount: 1 }),
      null,
    )
  })

  it('rejects a login with nothing to message from', () => {
    assert.match(
      missingMessagingAssetsError({ wabaCount: 0, pageCount: 0, instagramAccountCount: 0 }) ?? '',
      /WhatsApp account, Facebook Page, or Instagram account/,
    )
  })
})
