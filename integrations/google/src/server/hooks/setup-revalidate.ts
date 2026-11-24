import { setup, type SetupRevalidateHandler } from 'skedyul'
import { ensureCalendarWatches } from '../../lib/calendar-watches'
import { getAuthenticatedOAuthClient } from '../../lib/google_client'
import type { GoogleInstallEnv } from '../../lib/google_install_env'

/**
 * On CRM changes: invalidate listening CRM steps, then reconcile so steps
 * whose maps are still configured become READY again.
 */
export const setupRevalidateHandler: SetupRevalidateHandler = async (ctx) => {
  if (ctx.reason !== 'crm_changed') {
    return { completed: [], invalidated: [] }
  }

  const { steps } = await setup.list()
  const stepsByHandle = new Map(steps.map((step) => [step.handle, step]))
  const invalidated: string[] = []

  for (const handle of ctx.steps) {
    const step = stepsByHandle.get(handle)
    if (!step) continue
    if (step.kind !== 'CRM' && !step.config.listenToCrm) continue

    await setup.invalidate(handle, 'CRM schema changed', {
      reason: ctx.reason,
      crm: ctx.crm ?? null,
    })
    invalidated.push(handle)
  }

  if (typeof setup.reconcile === 'function') {
    await setup.reconcile()
  }

  // Maps changed (e.g. calendars just mapped): open push channels for
  // sync-enabled calendars. The platform renews them. Best-effort.
  try {
    const { client } = await getAuthenticatedOAuthClient(ctx.env as GoogleInstallEnv)
    await ensureCalendarWatches(client)
  } catch (error) {
    ctx.log?.warn?.('[Google Setup] Could not open calendar push channels:', error)
  }

  const after = await setup.list()
  const completed = after.steps
    .filter(
      (step) =>
        invalidated.includes(step.handle) && step.status === 'READY',
    )
    .map((step) => step.handle)

  return { completed, invalidated }
}

export default setupRevalidateHandler
