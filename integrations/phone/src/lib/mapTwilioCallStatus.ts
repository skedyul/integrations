/**
 * Map a raw Twilio call status string to platform CallStatus values.
 *
 * Twilio call lifecycle statuses:
 *   queued | initiated | ringing | in-progress | completed | busy | no-answer | failed | canceled
 * @see https://www.twilio.com/docs/voice/api/call-resource#call-status-values
 */

export type PlatformCallStatus =
  | 'SCHEDULED'
  | 'RINGING'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'ENDED'
  | 'MISSED'
  | 'DECLINED'
  | 'FAILED'

export function mapTwilioCallStatus(
  raw: string | null | undefined,
): PlatformCallStatus {
  switch ((raw ?? '').toLowerCase()) {
    case 'queued':
    case 'initiated':
    case 'ringing':
      return 'RINGING'
    case 'in-progress':
    case 'answered':
      return 'IN_PROGRESS'
    case 'completed':
      return 'ENDED'
    case 'busy':
      return 'DECLINED'
    case 'no-answer':
    case 'canceled':
    case 'cancelled':
      return 'MISSED'
    case 'failed':
      return 'FAILED'
    default:
      return 'RINGING'
  }
}

/** Whether a Twilio status represents a terminal (ended) call. */
export function isTerminalTwilioStatus(raw: string | null | undefined): boolean {
  return [
    'completed',
    'busy',
    'no-answer',
    'canceled',
    'cancelled',
    'failed',
  ].includes((raw ?? '').toLowerCase())
}
