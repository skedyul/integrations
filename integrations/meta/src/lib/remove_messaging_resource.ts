import { communicationChannel } from 'skedyul'

/**
 * Remove a communication channel by business identifier value.
 * Returns true if a channel was found and removed.
 */
export async function removeChannelByIdentifier(
  identifierValue: string,
): Promise<boolean> {
  const channels = await communicationChannel.list({
    filter: { identifierValue },
    limit: 1,
  })

  if (channels.length === 0) {
    return false
  }

  await communicationChannel.remove(channels[0].id)
  return true
}
