import { token, getConfig, runWithConfig } from 'skedyul'
import type { ReaEventName, ReaEventEmitPayload } from '../events/types'
import { isReaEventName } from '../events/schemas'
import { createReaEvent } from './create-rea-event'

export async function emitReaEvent<T extends ReaEventName>(
  appInstallationId: string,
  eventName: T,
  payload: ReaEventEmitPayload<T>,
  correlationId: string,
): Promise<{ emitted: boolean }> {
  if (!isReaEventName(eventName)) {
    throw new Error(`Unknown REA event: ${eventName}`)
  }

  const { token: scopedToken } = await token.exchangeRaw(appInstallationId)
  const { baseUrl } = getConfig()

  return runWithConfig({ baseUrl, apiToken: scopedToken }, async () => {
    const result = await createReaEvent(eventName, payload, {
      correlationId,
    })

    if (!result.emitted) {
      console.log(
        `[REA] Event ${eventName} passthrough (no subscription) correlation=${correlationId}`,
      )
    }

    return { emitted: result.emitted }
  })
}
