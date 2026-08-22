/**
 * Transcribe M4A Email Attachment
 *
 * Event-driven workflow: read an inbound email M4A attachment, transcribe it
 * with skedyul/ai object.generate (mode: audio), and return {success: true/false}.
 */

import { defineWorkflow } from 'skedyul'

export default defineWorkflow({
  handle: 'transcribe-m4a-attachment',
  label: 'Transcribe M4A Email Attachment',
  path: './transcribe-m4a-attachment.yml',

  requires: [{ channel: 'email' }],

  actions: [],
})
