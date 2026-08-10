import type { GoogleEventName, GoogleEventEmitPayload } from '../events/types'
import { isGoogleEventName } from '../events/schemas'
import { createGoogleEvent } from './create-google-event'
import { withInstallationScope } from './installation_scope'

export async function emitGoogleEvent<T extends GoogleEventName>(
  appInstallationId: string,
  eventName: T,
  payload: GoogleEventEmitPayload<T>,
  correlationId: string,
  trigger?: string,
): Promise<{ emitted: boolean }> {
  if (!isGoogleEventName(eventName)) {
    throw new Error(`Unknown Google event: ${eventName}`)
  }

  return withInstallationScope(appInstallationId, async () => {
    const result = await createGoogleEvent(eventName, payload, {
      correlationId,
      trigger,
    })

    if (!result.emitted) {
      console.log(
        `[Google] Event ${eventName} passthrough (no subscription) correlation=${correlationId}`,
      )
    }

    return { emitted: result.emitted }
  })
}
