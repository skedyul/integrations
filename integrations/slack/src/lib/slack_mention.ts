/** The bot's Slack user id, from the Events API `authorizations` list. */
export function botUserIdFromEvent(payload: {
  authorizations?: Array<{ user_id?: string; is_bot?: boolean }>
}): string | undefined {
  const list = payload.authorizations ?? []
  return (list.find((entry) => entry.is_bot) ?? list[0])?.user_id || undefined
}

/** True when the message text @mentions the bot (`<@U123>` or `<@U123|name>`). */
export function mentionsBot(text: string | undefined, botUserId: string | undefined): boolean {
  if (!text || !botUserId) return false
  return text.includes(`<@${botUserId}>`) || text.includes(`<@${botUserId}|`)
}
