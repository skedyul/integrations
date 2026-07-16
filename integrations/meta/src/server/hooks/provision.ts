import type { ProvisionHandlerContext, ProvisionHandlerResult } from 'skedyul'
import { instance, webhook } from 'skedyul'
import { ensureMetaAppWebhooks } from '../../lib/meta_app_webhooks'

const RECEIVE_META_WEBHOOK_NAME = 'receive_meta'

interface ProvisionEnv {
  META_APP_ID?: string
  META_APP_SECRET?: string
  META_WEBHOOK_VERIFY_TOKEN?: string
  GRAPH_API_VERSION?: string
}

/**
 * Provision handler for the Meta app.
 *
 * Runs once per app version deployment and:
 * 1. Registers the unified `receive_meta` webhook with Skedyul
 * 2. Configures the Meta app's webhook subscriptions to use that callback URL
 */
export default async function provision(
  ctx: ProvisionHandlerContext,
): Promise<ProvisionHandlerResult> {
  const env = ctx.env as ProvisionEnv
  const appVersionId = ctx.app.versionId

  ctx.log.info('[Meta Provision] === STARTING PROVISION ===')
  ctx.log.info(`[Meta Provision] App Version: ${appVersionId}`)

  ctx.log.info('[Meta Provision] Checking for existing webhook registrations...')
  const listResult = await webhook.list({ name: RECEIVE_META_WEBHOOK_NAME })
  const existingWebhooks = listResult.webhooks
  ctx.log.info(
    `[Meta Provision] Found ${existingWebhooks.length} existing registration(s)`,
  )

  let webhookUrl: string

  if (existingWebhooks.length > 0) {
    webhookUrl = existingWebhooks[0].url
    ctx.log.info(`[Meta Provision] Reusing existing webhook: ${webhookUrl}`)
  } else {
    ctx.log.info('[Meta Provision] Creating new webhook registration...')
    const webhookResult = await webhook.create(RECEIVE_META_WEBHOOK_NAME)
    webhookUrl = webhookResult.url
    ctx.log.info(`[Meta Provision] Created webhook: ${webhookUrl}`)
  }

  const metaAppId = env.META_APP_ID ?? process.env.META_APP_ID
  const metaAppSecret = env.META_APP_SECRET ?? process.env.META_APP_SECRET
  const verifyToken =
    env.META_WEBHOOK_VERIFY_TOKEN ?? process.env.META_WEBHOOK_VERIFY_TOKEN
  const graphApiVersion = env.GRAPH_API_VERSION ?? process.env.GRAPH_API_VERSION

  if (!metaAppId || !metaAppSecret || !verifyToken) {
    ctx.log.warn(
      '[Meta Provision] Skipping Meta app webhook configuration — missing META_APP_ID, META_APP_SECRET, or META_WEBHOOK_VERIFY_TOKEN',
    )
    ctx.log.warn(
      `[Meta Provision] Manual setup required. Paste this callback URL in the Meta App Dashboard: ${webhookUrl}`,
    )

    const dashboardUrl = metaAppId
      ? `https://developers.facebook.com/apps/${metaAppId}/webhooks/`
      : 'https://developers.facebook.com/apps/'

    await upsertMetaAppWebhookRecord(ctx, {
      callbackUrl: webhookUrl,
      dashboardUrl,
      setupStatus: 'manual_required',
      notes: 'Missing provision env vars for automatic Meta webhook configuration',
    })

    ctx.log.info('[Meta Provision] === COMPLETED ===')
    return {}
  }

  ctx.log.info('[Meta Provision] Configuring Meta app webhook subscriptions...')
  const setup = await ensureMetaAppWebhooks({
    appId: metaAppId,
    appSecret: metaAppSecret,
    graphApiVersion,
    callbackUrl: webhookUrl,
    verifyToken,
  })

  for (const result of setup.results) {
    if (result.status === 'configured') {
      ctx.log.info(
        `[Meta Provision] ${result.object}: ${result.message ?? 'configured'}`,
      )
      continue
    }

    ctx.log.error(
      `[Meta Provision] ${result.object}: ${result.message ?? 'configuration failed'}`,
    )
  }

  if (setup.manualSetupRequired) {
    ctx.log.warn('[Meta Provision] Some Meta webhook subscriptions could not be configured via API')
    ctx.log.warn(`[Meta Provision] Meta App Dashboard: ${setup.dashboardUrl}`)
    ctx.log.warn(`[Meta Provision] Callback URL: ${webhookUrl}`)
    ctx.log.warn(
      `[Meta Provision] Verify token: use the META_WEBHOOK_VERIFY_TOKEN value from provision env`,
    )
    ctx.log.warn(
      '[Meta Provision] Subscribe to messages (and delivery/read fields for WhatsApp and Messenger) for whatsapp_business_account, page, and instagram objects',
    )
  } else {
    ctx.log.info('[Meta Provision] Meta app webhook subscriptions configured successfully')
  }

  await upsertMetaAppWebhookRecord(ctx, {
    callbackUrl: webhookUrl,
    dashboardUrl: setup.dashboardUrl,
    setupStatus: setup.manualSetupRequired ? 'manual_required' : 'configured',
    notes: setup.results
      .map((result) => `${result.object}: ${result.status}${result.message ? ` (${result.message})` : ''}`)
      .join('; '),
  })

  ctx.log.info('[Meta Provision] === COMPLETED ===')

  return {}
}

async function upsertMetaAppWebhookRecord(
  ctx: ProvisionHandlerContext,
  input: {
    callbackUrl: string
    dashboardUrl: string
    setupStatus: 'configured' | 'manual_required' | 'pending'
    notes: string
  },
): Promise<void> {
  const existing = await instance.list('meta_app_webhook', { limit: 1 })

  if (existing.data.length > 0) {
    const record = existing.data[0] as { id: string }
    await instance.update('meta_app_webhook', record.id, {
      callback_url: input.callbackUrl,
      dashboard_url: input.dashboardUrl,
      setup_status: input.setupStatus,
      notes: input.notes,
    })
    ctx.log.info(`[Meta Provision] Updated meta_app_webhook record ${record.id}`)
    return
  }

  const created = await instance.create('meta_app_webhook', {
    callback_url: input.callbackUrl,
    dashboard_url: input.dashboardUrl,
    setup_status: input.setupStatus,
    notes: input.notes,
  })
  ctx.log.info(
    `[Meta Provision] Created meta_app_webhook record ${(created as { id: string }).id}`,
  )
}
