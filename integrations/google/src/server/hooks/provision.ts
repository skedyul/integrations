import type { ProvisionHandlerContext, ProvisionHandlerResult } from 'skedyul'

export default async function provision(
  ctx: ProvisionHandlerContext,
): Promise<ProvisionHandlerResult> {
  ctx.log.info('[Google Provision] Completed (calendar push webhooks register per installation during OAuth)')
  return {}
}
