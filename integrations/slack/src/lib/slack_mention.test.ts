import assert from 'node:assert/strict'
import test from 'node:test'
import { botUserIdFromEvent, mentionsBot } from './slack_mention.ts'

test('finds the bot user id in the event authorizations', () => {
  assert.equal(
    botUserIdFromEvent({ authorizations: [{ user_id: 'U_HUMAN' }, { user_id: 'U_BOT', is_bot: true }] }),
    'U_BOT',
  )
  assert.equal(botUserIdFromEvent({ authorizations: [{ user_id: 'U_ONLY' }] }), 'U_ONLY')
  assert.equal(botUserIdFromEvent({}), undefined)
})

test('detects an @mention of the bot only', () => {
  assert.equal(mentionsBot('<@U_BOT> how many bookings today?', 'U_BOT'), true)
  assert.equal(mentionsBot('hey <@U_BOT|skedyul> quick one', 'U_BOT'), true)
  assert.equal(mentionsBot('<@U_SAM> can you check?', 'U_BOT'), false)
  assert.equal(mentionsBot('no mention', 'U_BOT'), false)
  assert.equal(mentionsBot('<@U_BOT>', undefined), false)
})
