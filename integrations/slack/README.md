# Slack

Serverless integration for Slack channels and direct messages.

One communication channel is created per connected workspace (`identifierValue` is the Slack team id). Channel and group messages arrive as group threads keyed on the Slack channel id. Direct messages to the Skedyul app go to **Ask Skedyul**: the channel declares `capabilities.askSkedyul` (`conversations: ['direct']`, `addressing: 'installation'`, `matchMemberBy: ['email']`), and the webhook passes the sender's Slack profile email as `identity` so the platform can match them to a workplace member. Channel and group messages are unchanged.

Set `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, and `SLACK_SIGNING_SECRET` on the app version. After provision, paste the logged Events API URL into the Slack app. Bot scopes: `chat:write`, `channels:history`, `channels:read`, `groups:history`, `groups:read`, `im:history`, `im:read`, `mpim:history`, `mpim:read`, `users:read`, `users:read.email`. Reconnect Slack after those read scopes are added to the Slack app so the bot token is replaced. Channel and group messages are external conversations. `conversations.info` and `conversations.members` supply the room name and people; a failed lookup is logged (for example `missing_scope`) and the message is still received. The next message after a successful lookup sets the thread title and adds the people Slack returned.
