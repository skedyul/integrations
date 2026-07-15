import { event } from 'skedyul'
import type { ReaEventName, ReaEventEmitPayload } from '../events/types'
import { parseReaEventPayload } from '../events/schemas'

export interface CreateReaEventOptions {
  correlationId?: string
  trigger?: string
}

export async function createReaEvent<T extends ReaEventName>(
  eventName: T,
  payload: ReaEventEmitPayload<T>,
  options: CreateReaEventOptions = {},
): Promise<{ emitted: boolean }> {
  const validated = parseReaEventPayload(eventName, payload)

  return event.create(eventName, validated, {
    app: 'realestate',
    trigger: options.trigger ?? 'webhook',
    correlationId: options.correlationId,
  })
}
