import type { ProvisionHandlerContext, ProvisionHandlerResult } from 'skedyul'
import { webhook } from 'skedyul'

export default async function provision(
  ctx: ProvisionHandlerContext,
): Promise<ProvisionHandlerResult> {
  const existing = await webhook.list({ name: 'receive_slack' })
  if (existing.webhooks.length > 0) {
    ctx.log.info(`[Slack Provision] Events API URL: ${existing.webhooks[0].url}`)
    return {}
  }
  const created = await webhook.create('receive_slack')
  ctx.log.info(`[Slack Provision] Paste this Events API URL into the Slack app: ${created.url}`)
  return {}
}
