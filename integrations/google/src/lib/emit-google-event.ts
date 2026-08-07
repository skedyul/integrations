import { token, getConfig, runWithConfig } from 'skedyul'
import type { GoogleEventName, GoogleEventEmitPayload } from '../events/types'
import { isGoogleEventName } from '../events/schemas'
import { createGoogleEvent } from './create-google-event'

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

  const { token: scopedToken } = await token.exchangeRaw(appInstallationId)
  const { baseUrl } = getConfig()

  return runWithConfig({ baseUrl, apiToken: scopedToken }, async () => {
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
