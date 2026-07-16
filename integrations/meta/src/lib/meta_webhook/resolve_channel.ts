import {
  communicationChannel,
  getConfig,
  instance,
  runWithConfig,
  token,
} from 'skedyul'

export type ResolveMetaChannelInput = {
  modelHandle: string
  filter: Record<string, string>
  channelHandle: string
  channelIdentifierField: string
}

/**
 * Resolve a communication channel for an inbound Meta webhook event.
 *
 * Uses the token-exchange pattern (mirrors Phone integration):
 * 1. Search internal CRM model across installations (sk_app_ token)
 * 2. Exchange for installation-scoped token
 * 3. Look up communication channel by business identifier
 */
export async function resolveChannelForMetaResource(
  input: ResolveMetaChannelInput,
): Promise<{ channelId: string; channelIdentifier: string } | null> {
  const searchResults = await instance.list(input.modelHandle, {
    filter: input.filter,
    limit: 1,
  })

  if (searchResults.data.length === 0) {
    console.log(
      `[resolveChannel] No ${input.modelHandle} found for filter`,
      input.filter,
    )
    return null
  }

  const record = searchResults.data[0] as Record<string, unknown> & {
    appInstallationId?: string
  }

  const appInstallationId = record.appInstallationId
  if (!appInstallationId) {
    console.log(`[resolveChannel] ${input.modelHandle} record missing appInstallationId`)
    return null
  }

  const channelIdentifier = record[input.channelIdentifierField]
  if (typeof channelIdentifier !== 'string' || !channelIdentifier) {
    console.log(
      `[resolveChannel] ${input.modelHandle} missing ${input.channelIdentifierField}`,
    )
    return null
  }

  const { token: scopedToken } = await token.exchange(appInstallationId)
  const config = getConfig()

  return runWithConfig({ baseUrl: config.baseUrl, apiToken: scopedToken }, async () => {
    const channels = await communicationChannel.list({
      filter: { identifierValue: channelIdentifier },
      limit: 1,
    })

    if (channels.length === 0) {
      console.log(
        `[resolveChannel] No ${input.channelHandle} channel for ${channelIdentifier}`,
      )
      return null
    }

    return {
      channelId: channels[0].id,
      channelIdentifier,
    }
  })
}
