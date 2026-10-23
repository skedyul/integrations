import assert from 'node:assert/strict'
import test from 'node:test'
import { describeSlackConversation } from './slack_room.ts'

test('names the channel and the people in it, skipping bots', async () => {
  const original = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input)
    const method = new URL(url).pathname.split('/').pop()
    const body =
      method === 'conversations.info'
        ? { ok: true, channel: { name: 'general' } }
        : method === 'conversations.members'
          ? { ok: true, members: ['U1', 'U2', 'UBOT'], response_metadata: { next_cursor: '' } }
          : method === 'users.info' && url.includes('user=U1')
            ? { ok: true, user: { id: 'U1', real_name: 'Ada', profile: { image_72: 'https://example.com/a.png' } } }
            : method === 'users.info' && url.includes('user=U2')
              ? { ok: true, user: { id: 'U2', profile: { display_name: 'Grace' } } }
              : { ok: true, user: { id: 'UBOT', is_bot: true, real_name: 'Bot' } }
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const room = await describeSlackConversation({
      botToken: 'xoxb-test',
      channelId: 'C1',
      senderId: 'U1',
    })
    assert.equal(room.name, 'general')
    assert.deepEqual(
      room.participants.map((person) => person.identifierValue),
      ['U1', 'U2'],
    )
    assert.equal(room.participants[0]?.displayName, 'Ada')
    assert.equal(room.participants[0]?.avatarUrl, 'https://example.com/a.png')
    assert.equal(room.participants[1]?.displayName, 'Grace')
  } finally {
    globalThis.fetch = original
  }
})

test('a failed lookup still returns the sender id', async () => {
  const original = globalThis.fetch
  globalThis.fetch = (async () => new Response(JSON.stringify({ ok: false, error: 'ratelimited' }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })) as typeof fetch
  try {
    const room = await describeSlackConversation({
      botToken: 'xoxb-test',
      channelId: 'C1',
      senderId: 'U1',
    })
    assert.equal(room.name, undefined)
    assert.deepEqual(room.participants, [{ identifierValue: 'U1' }])
  } finally {
    globalThis.fetch = original
  }
})
