# Slack

Serverless integration for Slack channels and direct messages.

One communication channel is created per connected workspace (`identifierValue` is the Slack team id). Channel and group messages arrive as group threads. Direct messages arrive as 1:1 threads. Staff are matched to workplace members by email when Slack returns one.

Set `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, and `SLACK_SIGNING_SECRET` on the app version. After provision, paste the logged Events API URL into the Slack app. Bot scopes: `chat:write`, `channels:history`, `groups:history`, `im:history`, `mpim:history`, `users:read`, `users:read.email`.
