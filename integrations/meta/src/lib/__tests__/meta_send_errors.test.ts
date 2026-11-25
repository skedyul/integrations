import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { classifyMetaSendError } from '../meta_send_errors.ts'

describe('classifyMetaSendError', () => {
  it('treats the WhatsApp re-engagement error as a closed window', () => {
    assert.equal(
      classifyMetaSendError({ code: 131047, message: 'Re-engagement message' }),
      'window_closed',
    )
  })

  it('treats Messenger and Instagram outside-window errors as a closed window, not auth', () => {
    assert.equal(
      classifyMetaSendError({
        code: 10,
        type: 'OAuthException',
        error_subcode: 2018278,
        message: '(#10) This message is sent outside of allowed window.',
      }),
      'window_closed',
    )
    assert.equal(
      classifyMetaSendError({ code: 10, type: 'OAuthException', error_subcode: 2534022 }),
      'window_closed',
    )
    assert.equal(
      classifyMetaSendError({
        code: 10,
        type: 'OAuthException',
        message: 'This message is sent outside of allowed window.',
      }),
      'window_closed',
    )
  })

  it('still reports token problems as auth', () => {
    assert.equal(classifyMetaSendError({ code: 190 }), 'auth')
    assert.equal(classifyMetaSendError({ code: 102 }), 'auth')
    assert.equal(
      classifyMetaSendError({ code: 10, type: 'OAuthException', message: 'Permission denied' }),
      'auth',
    )
  })

  it('leaves everything else as other', () => {
    assert.equal(classifyMetaSendError({ code: 131026, message: 'Undeliverable' }), 'other')
    assert.equal(classifyMetaSendError(undefined), 'other')
  })
})
