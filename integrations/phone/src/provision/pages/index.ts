/**
 * Pages index
 *
 * Re-exports all page definitions from their folder-based locations.
 */

export { default as compliance } from './compliance/page'
export { default as phoneNumbers } from './phone-numbers/page'
export { default as phoneNumberOverview } from './phone-numbers/[phone_id]/overview/page'
export { default as phoneNumberMessaging } from './phone-numbers/[phone_id]/messaging/page'
export { default as phoneNumberVoice } from './phone-numbers/[phone_id]/voice/page'
