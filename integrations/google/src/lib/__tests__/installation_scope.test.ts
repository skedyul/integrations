import { describe, expect, it, jest, beforeAll, beforeEach } from '@jest/globals'

const exchangeRaw = jest.fn<(id: string) => Promise<{ token: string; appInstallationId: string }>>()
let currentToken = ''

jest.unstable_mockModule('skedyul', () => ({
  getConfig: () => ({ baseUrl: 'https://admin.example', apiToken: currentToken }),
  token: { exchangeRaw },
  runWithConfig: async (config: { apiToken: string }, fn: () => Promise<unknown>) => {
    const previous = currentToken
    currentToken = config.apiToken
    try {
      return await fn()
    } finally {
      currentToken = previous
    }
  },
}))

type WithInstallationScope = <T>(
  appInstallationId: string,
  fn: () => Promise<T>,
) => Promise<T>

let withInstallationScope: WithInstallationScope

beforeAll(async () => {
  ;({ withInstallationScope } = await import('../installation_scope'))
})

describe('withInstallationScope', () => {
  beforeEach(() => {
    exchangeRaw.mockReset()
    exchangeRaw.mockResolvedValue({ token: 'sk_wkp_scoped', appInstallationId: 'install-1' })
  })

  it('exchanges a provision token for an installation-scoped token', async () => {
    currentToken = 'sk_prv_provision'

    const seen = await withInstallationScope('install-1', async () => currentToken)

    expect(exchangeRaw).toHaveBeenCalledTimes(1)
    expect(seen).toBe('sk_wkp_scoped')
    expect(currentToken).toBe('sk_prv_provision')
  })

  it('reuses the existing token when already installation-scoped', async () => {
    currentToken = 'sk_wkp_existing'

    const seen = await withInstallationScope('install-1', async () => currentToken)

    expect(exchangeRaw).not.toHaveBeenCalled()
    expect(seen).toBe('sk_wkp_existing')
  })

  it('does not re-exchange when nested inside an outer scope', async () => {
    currentToken = 'sk_prv_provision'

    await withInstallationScope('install-1', async () => {
      await withInstallationScope('install-1', async () => {
        expect(currentToken).toBe('sk_wkp_scoped')
      })
    })

    expect(exchangeRaw).toHaveBeenCalledTimes(1)
  })
})
