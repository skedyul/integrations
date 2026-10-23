import assert from 'node:assert/strict'
import test from 'node:test'
import { groupFromMessaging, groupFromWhatsApp } from './inbound_group.ts'

test('whatsapp group forwards the subject and known people', () => {
  const group = groupFromWhatsApp({
    groupId: 'wa-group',
    subject: 'Saturday class',
    from: '15551212',
    contacts: [
      { wa_id: '15551212', profile: { name: 'Grace' } },
      { wa_id: '15550000', profile: { name: 'Ada' } },
    ],
  })
  assert.deepEqual(group, {
    identifierValue: 'wa-group',
    name: 'Saturday class',
    participants: [
      { identifierValue: '15551212', displayName: 'Grace' },
      { identifierValue: '15550000', displayName: 'Ada' },
    ],
  })
})

test('whatsapp group uses looked-up members and the sender name', () => {
  const group = groupFromWhatsApp({
    groupId: 'wa-group',
    subject: 'Saturday class',
    from: '15551212',
    contacts: [{ wa_id: '15551212', profile: { name: 'Grace' } }],
    members: [{ identifierValue: '15551212' }, { identifierValue: '15550000' }],
  })
  assert.deepEqual(group, {
    identifierValue: 'wa-group',
    name: 'Saturday class',
    participants: [
      { identifierValue: '15551212', displayName: 'Grace' },
      { identifierValue: '15550000' },
    ],
  })
})

test('whatsapp without a group id stays a direct message', () => {
  assert.equal(
    groupFromWhatsApp({
      from: '15551212',
      contacts: [{ wa_id: '15551212', profile: { name: 'Grace' } }],
    }),
    undefined,
  )
})

test('messenger and instagram use a thread id as the room', () => {
  assert.deepEqual(
    groupFromMessaging({
      threadId: 'thread-1',
      threadName: 'Family',
      senderId: 'psid-1',
      senderName: 'Lin',
    }),
    {
      identifierValue: 'thread-1',
      name: 'Family',
      participants: [{ identifierValue: 'psid-1', displayName: 'Lin' }],
    },
  )
  assert.equal(groupFromMessaging({ senderId: 'psid-1', senderName: 'Lin' }), undefined)
})
