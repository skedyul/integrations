# Slack

Serverless integration for Slack channels and direct messages.

One communication channel is created per connected workspace (`identifierValue` is the Slack team id). Channel and group messages arrive as group threads keyed on the Slack channel id. Direct messages arrive as 1:1 threads keyed on the Slack user id. Those ids are the only addresses; Slack user ids are not matched to workplace member emails.

Set `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, and `SLACK_SIGNING_SECRET` on the app version. After provision, paste the logged Events API URL into the Slack app. Bot scopes: `chat:write`, `channels:history`, `channels:read`, `groups:history`, `groups:read`, `im:history`, `im:read`, `mpim:history`, `mpim:read`, `users:read`. Reconnect Slack after those read scopes are added to the Slack app so the bot token is replaced.
