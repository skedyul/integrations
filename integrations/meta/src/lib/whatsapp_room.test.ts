import assert from 'node:assert/strict'
import test from 'node:test'
import { describeWhatsAppGroup } from './whatsapp_room.ts'

test('reads the group subject and participant ids', async () => {
  const original = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input)
    assert.match(url, /\/wa-group\?/)
    assert.match(url, /fields=subject%2Cparticipants/)
    return new Response(
      JSON.stringify({
        subject: 'Saturday class',
        participants: [{ wa_id: '15551212' }, { wa_id: '15550000' }],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )
  }) as typeof fetch

  try {
    const room = await describeWhatsAppGroup({
      accessToken: 'token',
      groupId: 'wa-group',
      graphVersion: 'v24.0',
    })
    assert.equal(room.name, 'Saturday class')
    assert.deepEqual(
      room.participants.map((person) => person.identifierValue),
      ['15551212', '15550000'],
    )
  } finally {
    globalThis.fetch = original
  }
})

test('a failed group lookup is logged and returns no subject', async () => {
  const original = globalThis.fetch
  const logs: string[] = []
  const originalLog = console.log
  console.log = (...args: unknown[]) => {
    logs.push(args.join(' '))
  }
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ error: { message: '(#10) permission denied', code: 10 } }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })) as typeof fetch

  try {
    const room = await describeWhatsAppGroup({
      accessToken: 'token',
      groupId: 'wa-group',
      graphVersion: 'v24.0',
    })
    assert.equal(room.name, undefined)
    assert.deepEqual(room.participants, [])
    assert.match(logs.join('\n'), /group lookup failed: \(#10\) permission denied/)
  } finally {
    globalThis.fetch = original
    console.log = originalLog
  }
})
