import assert from 'node:assert/strict'
import test from 'node:test'
import { profileFromGraph } from './sender_profile.ts'

test('profile photo is kept only when Graph returns one', () => {
  assert.deepEqual(
    profileFromGraph({
      name: ' Lin ',
      profile_pic: ' https://cdn.example/lin.jpg ',
    }),
    { name: 'Lin', avatarUrl: 'https://cdn.example/lin.jpg' },
  )
  assert.deepEqual(profileFromGraph({ name: 'Lin' }), { name: 'Lin' })
  assert.deepEqual(profileFromGraph({ profile_pic: '' }), {})
  assert.deepEqual(profileFromGraph(null), {})
})
