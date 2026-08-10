import { getConfig, runWithConfig, token } from 'skedyul'

const INSTALLATION_TOKEN_PREFIX = 'sk_wkp_'

/**
 * Run `fn` with an installation-scoped (`sk_wkp_`) token.
 *
 * Nesting-safe: `token.exchange` is only accepted for `sk_app_`/`sk_prv_` tokens, so
 * when the caller already holds an installation-scoped token the exchange is skipped
 * rather than rejected by the Core API.
 */
export async function withInstallationScope<T>(
  appInstallationId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const config = getConfig()

  if (config.apiToken?.startsWith(INSTALLATION_TOKEN_PREFIX)) {
    return fn()
  }

  const { token: scopedToken } = await token.exchangeRaw(appInstallationId)
  return runWithConfig({ ...config, apiToken: scopedToken }, fn)
}
