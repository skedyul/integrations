import assert from 'node:assert/strict'
import test from 'node:test'
import type { WebhookRequest } from 'skedyul'
import { handleMetaVerificationChallenge } from './verify.ts'

function challengeRequest(query: WebhookRequest['query']): WebhookRequest {
  return {
    method: 'GET',
    url: 'https://example.test/webhook',
    path: '/webhook',
    headers: {},
    query,
    body: '',
  }
}

test('a matching subscribe challenge is returned as plain text', () => {
  const response = handleMetaVerificationChallenge(
    challengeRequest({
      'hub.mode': 'subscribe',
      'hub.verify_token': 'expected-token',
      'hub.challenge': '659001364',
    }),
    'expected-token',
  )

  assert.equal(response.status, 200)
  assert.equal(response.body, '659001364')
  assert.equal(response.headers?.['Content-Type'], 'text/plain')
})

test('a token mismatch is rejected', () => {
  const response = handleMetaVerificationChallenge(
    challengeRequest({
      'hub.mode': 'subscribe',
      'hub.verify_token': 'other-token',
      'hub.challenge': '659001364',
    }),
    'expected-token',
  )

  assert.equal(response.status, 403)
})
