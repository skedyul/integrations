import type { ProvisionHandlerContext, ProvisionHandlerResult } from 'skedyul'
import { webhook } from 'skedyul'

const RECEIVE_META_WEBHOOK_NAME = 'receive_meta'

/**
 * Provision handler for the Meta app.
 *
 * Runs once per app version deployment and ensures the unified
 * `receive_meta` webhook is registered with Skedyul so Meta can deliver
 * WhatsApp, Messenger, and Instagram events to a stable callback URL.
 */
export default async function provision(
  ctx: ProvisionHandlerContext,
): Promise<ProvisionHandlerResult> {
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

  ctx.log.info(
    `[Meta Provision] Configure this URL in the Meta App Dashboard for WhatsApp, Page, and Instagram webhooks`,
  )
  ctx.log.info('[Meta Provision] === COMPLETED ===')

  return {}
}
