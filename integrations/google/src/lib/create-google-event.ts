import { event } from 'skedyul'
import type { GoogleEventName, GoogleEventEmitPayload } from '../events/types'
import { parseGoogleEventPayload } from '../events/schemas'

export interface CreateGoogleEventOptions {
  correlationId?: string
  trigger?: string
}

export async function createGoogleEvent<T extends GoogleEventName>(
  eventName: T,
  payload: GoogleEventEmitPayload<T>,
  options: CreateGoogleEventOptions = {},
): Promise<{ emitted: boolean }> {
  const validated = parseGoogleEventPayload(eventName, payload)

  return event.create(eventName, validated, {
    app: 'google',
    trigger: options.trigger ?? 'tool',
    correlationId: options.correlationId,
  })
}
