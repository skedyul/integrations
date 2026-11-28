import {
  dialableNumber,
  formatCallRecipients,
  parseCallRecipients,
  twimlAppName,
  voiceIdentity,
} from './outbound_voice'
import { buildOutboundDialTwiml, buildRingAppsTwiml } from '../webhooks/lib/twiml'
import {
  VOICE_KEY_NAME,
  VOICE_KEY_RETIRE_AFTER_MS,
  keysToRetire,
} from './voice_signing_key'

describe('outbound voice', () => {
  it('makes a Twilio-safe identity from a member id', () => {
    expect(voiceIdentity('mb_abc-123')).toBe('member_mb_abc_123')
    expect(voiceIdentity('')).toBe('member_unknown')
  })

  it('names one TwiML application per installation', () => {
    expect(twimlAppName('ins_1')).toBe('Skedyul calls ins_1')
    expect(twimlAppName('x'.repeat(100)).length).toBeLessThanOrEqual(64)
  })

  it('accepts phone numbers and nothing else', () => {
    expect(dialableNumber('+61 412 555 010')).toBe('+61412555010')
    expect(dialableNumber('(02) 9555-0100')).toBe('0295550100')
    expect(dialableNumber('client:someone')).toBeNull()
    expect(dialableNumber('sip:a@b.c')).toBeNull()
    expect(dialableNumber('')).toBeNull()
  })

  it('dials the customer from the workplace number, tracks labelled from our side', () => {
    const twiml = buildOutboundDialTwiml({
      callerId: '+61468092925',
      toNumber: '+61412555010',
      transcriptionCallbackUrl: 'https://example.com/t',
      statusCallbackUrl: 'https://example.com/s',
      transcriptionName: 'call_1',
    })
    expect(twiml).toContain('<Dial callerId="+61468092925" answerOnBridge="true">')
    expect(twiml).toContain('>+61412555010</Number>')
    // Twilio hears our team member first on a call we place.
    expect(twiml).toContain('inboundTrackLabel="agent"')
    expect(twiml).toContain('outboundTrackLabel="caller"')
    expect(twiml).toContain('statusCallback="https://example.com/s"')
  })

  it('still dials when the per-call callbacks could not be registered', () => {
    const twiml = buildOutboundDialTwiml({
      callerId: '+61468092925',
      toNumber: '+61412555010',
      transcriptionName: 'call_1',
    })
    expect(twiml).not.toContain('<Start>')
    expect(twiml).toContain('<Number>+61412555010</Number>')
  })

  it('stores who a number rings, and reads it back as client identities', () => {
    const stored = formatCallRecipients(['mb_2', ' mb_1 ', 'mb_2', ''])
    expect(stored).toBe('mb_1,mb_2')
    expect(parseCallRecipients(stored)).toEqual(['member_mb_1', 'member_mb_2'])
    expect(parseCallRecipients(null)).toEqual([])
    expect(parseCallRecipients('')).toEqual([])
  })

  it('rings every app at once, then asks what to do next', () => {
    const twiml = buildRingAppsTwiml({
      callerId: '+61412555010',
      identities: ['member_mb_1', 'member_mb_2'],
      parameters: { CallerName: 'Dana & Co', ThreadId: 'thd_1', LineName: '' },
      actionUrl: 'https://example.com/fallback',
      timeoutSeconds: 20,
      transcriptionName: 'call_1',
    })
    expect(twiml).toContain(
      '<Dial callerId="+61412555010" timeout="20" action="https://example.com/fallback" method="POST">',
    )
    expect(twiml.match(/<Client>/g)).toHaveLength(2)
    expect(twiml).toContain('<Identity>member_mb_2</Identity>')
    // Values are escaped; empty ones are left out.
    expect(twiml).toContain('<Parameter name="CallerName" value="Dana &amp; Co"/>')
    expect(twiml).not.toContain('LineName')
  })

  it('retires only its own signing keys, and only old ones', () => {
    const now = Date.UTC(2026, 0, 2)
    const old = new Date(now - VOICE_KEY_RETIRE_AFTER_MS - 1000)
    const fresh = new Date(now - 60_000)
    expect(
      keysToRetire(
        [
          { sid: 'SK_old', friendlyName: VOICE_KEY_NAME, dateCreated: old },
          { sid: 'SK_fresh', friendlyName: VOICE_KEY_NAME, dateCreated: fresh },
          { sid: 'SK_current', friendlyName: VOICE_KEY_NAME, dateCreated: old },
          { sid: 'SK_someone_elses', friendlyName: 'Production', dateCreated: old },
          { sid: 'SK_undated', friendlyName: VOICE_KEY_NAME, dateCreated: null },
        ],
        now,
        'SK_current',
      ),
    ).toEqual(['SK_old'])
  })
})
