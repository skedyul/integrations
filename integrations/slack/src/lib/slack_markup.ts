/**
 * Slack message markup → readable text for Skedyul.
 * https://api.slack.com/reference/surfaces/formatting
 *
 * - `<@U123>` / `<@U123|name>` → `@Name` (the bot itself → `@Skedyul`)
 * - `<#C123|general>` → `#general`
 * - `<!here>` / `<!channel>` / `<!everyone>` → `@here` / `@channel` / `@everyone`
 * - `<!subteam^S123|@team>` → `@team`; `<!date^…|fallback>` → `fallback`
 * - `<https://x|label>` → `label (https://x)`; `<https://x>` → `https://x`
 * - `<mailto:a@b.c|a@b.c>` → `a@b.c`
 * - `&lt;` `&gt;` `&amp;` → `<` `>` `&`
 */

export const SKEDYUL_MENTION = '@Skedyul'

const TOKEN = /<([^<>\s][^<>]*)>/g

/** User ids mentioned in the text, in order, without duplicates. */
export function slackMentionedUserIds(text: string | undefined): string[] {
  if (!text) return []
  const ids: string[] = []
  for (const match of text.matchAll(/<@([UW][A-Z0-9]+)(?:\|[^>]*)?>/g)) {
    const id = match[1]!
    if (!ids.includes(id)) ids.push(id)
  }
  return ids
}

function unescape(text: string): string {
  return text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
}

function splitToken(body: string): [string, string | undefined] {
  const bar = body.indexOf('|')
  return bar === -1 ? [body, undefined] : [body.slice(0, bar), body.slice(bar + 1)]
}

export function slackTextToPlain(
  text: string,
  options: { botUserId?: string; names?: ReadonlyMap<string, string | undefined> } = {},
): string {
  const converted = text.replace(TOKEN, (whole, body: string) => {
    const [target, label] = splitToken(body)
    if (target.startsWith('@')) {
      const id = target.slice(1)
      if (options.botUserId && id === options.botUserId) return SKEDYUL_MENTION
      const name = options.names?.get(id) || label
      return name ? `@${name.replace(/^@/, '')}` : '@someone'
    }
    if (target.startsWith('#')) {
      return label ? `#${label}` : '#channel'
    }
    if (target.startsWith('!')) {
      const command = target.slice(1)
      if (command === 'here' || command === 'channel' || command === 'everyone') {
        return `@${command}`
      }
      if (label) return label
      return whole
    }
    if (target.startsWith('mailto:')) {
      return label || target.slice('mailto:'.length)
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) {
      const url = unescape(target)
      if (!label || unescape(label) === url) return url
      return `${unescape(label)} (${url})`
    }
    return whole
  })
  return unescape(converted)
}
