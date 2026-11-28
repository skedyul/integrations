import type { createTwilioClient } from './twilio_client'
import { withTwilioAuth } from './twilio_client'

/**
 * The Twilio API key that signs voice access tokens.
 *
 * An access token cannot be signed with the account's auth token; Twilio
 * wants an API key. When one is configured (`TWILIO_API_KEY_SID` and
 * `TWILIO_API_KEY_SECRET`) it is used. Otherwise the app makes its own:
 * a key is created through the API on first use and kept in memory for as
 * long as this process lives. Twilio only shows a key's secret when it is
 * created, and the app has nowhere durable to keep one, so a new process
 * makes a new key and retires the ones it finds from earlier processes.
 *
 * Retiring is safe after a short while: a token is only checked against its
 * key at the moment a device connects or registers, never afterwards. Keys
 * are left alone for an hour so tokens another process handed out moments
 * ago still work.
 */

export type VoiceSigningKey = { sid: string; secret: string }

/** How our own keys are recognised among the account's. */
export const VOICE_KEY_NAME = 'Skedyul calls (auto)'

/** A key older than this was made by a process that has since been replaced. */
export const VOICE_KEY_RETIRE_AFTER_MS = 60 * 60 * 1000

/** Which of the account's keys are ours and old enough to delete. */
export function keysToRetire(
  keys: { sid: string; friendlyName?: string | null; dateCreated?: Date | null }[],
  now: number,
  keepSid?: string,
): string[] {
  return keys
    .filter(
      (key) =>
        key.friendlyName === VOICE_KEY_NAME &&
        key.sid !== keepSid &&
        key.dateCreated instanceof Date &&
        now - key.dateCreated.getTime() > VOICE_KEY_RETIRE_AFTER_MS,
    )
    .map((key) => key.sid)
}

const made = new Map<string, VoiceSigningKey>()

export async function getVoiceSigningKey(
  client: ReturnType<typeof createTwilioClient>,
  env: Record<string, string | undefined>,
): Promise<VoiceSigningKey> {
  if (env.TWILIO_API_KEY_SID && env.TWILIO_API_KEY_SECRET) {
    return { sid: env.TWILIO_API_KEY_SID, secret: env.TWILIO_API_KEY_SECRET }
  }
  const account = env.TWILIO_ACCOUNT_SID ?? ''
  const cached = made.get(account)
  if (cached) return cached

  const created = await withTwilioAuth(() =>
    client.newKeys.create({ friendlyName: VOICE_KEY_NAME }),
  )
  const key = { sid: created.sid, secret: created.secret }
  made.set(account, key)

  // Tidy up after earlier processes. Never worth failing a call over.
  try {
    const existing = await client.keys.list({ limit: 100 })
    for (const sid of keysToRetire(existing, Date.now(), key.sid)) {
      await client.keys(sid).remove()
    }
  } catch (error) {
    console.warn('[voiceSigningKey] Could not retire old keys:', error)
  }
  return key
}
