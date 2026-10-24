import assert from 'node:assert/strict'
import test from 'node:test'
import { pickChannel, toE164Phone } from './phone_identifier.ts'

const phoneChannel = {
  id: 'comm_phone',
  handle: 'phone',
  identifierValue: '+61485089337',
}
const whatsappChannel = {
  id: 'comm_whatsapp',
  handle: 'whatsapp',
  identifierValue: '+61 485 089 337',
}

test('a shared number resolves to the WhatsApp channel', () => {
  const picked = pickChannel([phoneChannel, whatsappChannel], {
    channelHandle: 'whatsapp',
    channelIdentifier: '+61485089337',
  })

  assert.equal(picked?.id, 'comm_whatsapp')
})

test('an exact WhatsApp identifier is used before a formatted twin', () => {
  const exact = {
    id: 'comm_exact',
    handle: 'whatsapp',
    identifierValue: '+61485089337',
  }
  const picked = pickChannel([whatsappChannel, exact], {
    channelHandle: 'whatsapp',
    channelIdentifier: '+61485089337',
  })

  assert.equal(picked?.id, 'comm_exact')
})

test('messenger stays on an exact identifier', () => {
  const picked = pickChannel(
    [
      { id: 'page', handle: 'messenger', identifierValue: '102066769549127' },
      { id: 'other', handle: 'messenger', identifierValue: '1020 6676 9549 127' },
    ],
    { channelHandle: 'messenger', channelIdentifier: '102066769549127' },
  )

  assert.equal(picked?.id, 'page')
})

test('Meta display numbers become E.164', () => {
  assert.equal(toE164Phone('+61 485 089 337'), '+61485089337')
  assert.equal(toE164Phone('61485089337'), '+61485089337')
  assert.equal(toE164Phone('+61485089337'), '+61485089337')
})
