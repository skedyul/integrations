import assert from 'node:assert/strict'
import test from 'node:test'
import { downloadableSlackFiles, isReceivedSubtype } from './slack_files.ts'

test('receives plain messages, file shares and thread broadcasts only', () => {
  assert.equal(isReceivedSubtype(undefined), true)
  assert.equal(isReceivedSubtype('file_share'), true)
  assert.equal(isReceivedSubtype('thread_broadcast'), true)
  assert.equal(isReceivedSubtype('message_changed'), false)
  assert.equal(isReceivedSubtype('bot_message'), false)
  assert.equal(isReceivedSubtype('channel_join'), false)
})

test('keeps files the bot can download', () => {
  const files = downloadableSlackFiles([
    { id: 'F1', url_private_download: 'https://files.slack.com/a' },
    { id: 'F2', url_private: 'https://files.slack.com/b' },
    { id: 'F3', mode: 'tombstone', url_private: 'https://files.slack.com/c' },
    { id: 'F4', mode: 'hidden_by_limit', url_private: 'https://files.slack.com/d' },
    { id: 'F5' },
  ])
  assert.deepEqual(files.map((entry) => entry.id), ['F1', 'F2'])
  assert.deepEqual(downloadableSlackFiles(undefined), [])
})
