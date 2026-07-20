import type { ProvisionHandlerContext, ProvisionHandlerResult } from 'skedyul'
import { instance } from 'skedyul'

export default async function provision(
  ctx: ProvisionHandlerContext,
): Promise<ProvisionHandlerResult> {
  ctx.log.info('[Google Provision] Starting provision')

  await upsertGoogleAppWebhookRecord(ctx, {
    callbackUrl: 'Created automatically per installation during OAuth',
    setupStatus: 'configured',
    notes:
      'Install-scoped calendar_push webhooks are registered automatically during OAuth or when linking calendars.',
  })

  ctx.log.info('[Google Provision] Completed successfully')
  return {}
}

async function upsertGoogleAppWebhookRecord(
  ctx: ProvisionHandlerContext,
  input: {
    callbackUrl: string
    setupStatus: 'pending' | 'configured' | 'manual_required'
    notes?: string
  },
): Promise<void> {
  const existing = await instance.list('google_app_webhook', { limit: 1 })
  const payload = {
    callback_url: input.callbackUrl,
    setup_status: input.setupStatus,
    notes: input.notes ?? null,
  }

  if (existing.data.length > 0) {
    const record = existing.data[0] as { id: string }
    await instance.update('google_app_webhook', record.id, payload)
    ctx.log.info(`[Google Provision] Updated google_app_webhook record ${record.id}`)
    return
  }

  await instance.create('google_app_webhook', payload)
  ctx.log.info('[Google Provision] Created google_app_webhook record')
}
