import assert from 'node:assert/strict'
import test from 'node:test'
import { slackMentionedUserIds, slackTextToPlain } from './slack_markup.ts'

const names = new Map([
  ['U0CKJMW3CDP', 'Brett'],
  ['U08K411KX3P', 'Avin'],
])

test('turns user mentions into @Name and the bot into @Skedyul', () => {
  assert.equal(
    slackTextToPlain('<@U0CKJMW3CDP> have just offered 4pm to call her', { names }),
    '@Brett have just offered 4pm to call her',
  )
  assert.equal(
    slackTextToPlain('<@U0CBT2NJ0H3> how many customers do I have', {
      botUserId: 'U0CBT2NJ0H3',
      names,
    }),
    '@Skedyul how many customers do I have',
  )
  assert.equal(slackTextToPlain('hi <@U999|sam>', { names }), 'hi @sam')
  assert.equal(slackTextToPlain('hi <@U999>', { names }), 'hi @someone')
})

test('turns links, channels and broadcasts into text', () => {
  assert.equal(
    slackTextToPlain('here btw\n<https://admin.skedyul.it/skedyul/threads/thd_1?a=1&amp;b=2>'),
    'here btw\nhttps://admin.skedyul.it/skedyul/threads/thd_1?a=1&b=2',
  )
  assert.equal(
    slackTextToPlain('see <https://skedyul.it|our site>'),
    'see our site (https://skedyul.it)',
  )
  assert.equal(slackTextToPlain('mail <mailto:sam@x.com|sam@x.com>'), 'mail sam@x.com')
  assert.equal(slackTextToPlain('in <#C123|front-desk> <!here>'), 'in #front-desk @here')
  assert.equal(slackTextToPlain('<!subteam^S1|@coaches> ping'), '@coaches ping')
  assert.equal(slackTextToPlain('1 &lt; 2 &amp;&amp; 3 &gt; 2'), '1 < 2 && 3 > 2')
})

test('lists mentioned user ids once, in order', () => {
  assert.deepEqual(
    slackMentionedUserIds('<@U1> and <@U2|b> and <@U1> <#C1|x>'),
    ['U1', 'U2'],
  )
  assert.deepEqual(slackMentionedUserIds(undefined), [])
})
