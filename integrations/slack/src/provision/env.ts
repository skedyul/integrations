import { defineEnv } from 'skedyul'

export default defineEnv({
  SLACK_CLIENT_ID: {
    label: 'Slack Client ID',
    scope: 'provision',
    required: true,
    visibility: 'visible',
    description: 'Slack app client ID',
  },
  SLACK_CLIENT_SECRET: {
    label: 'Slack Client Secret',
    scope: 'provision',
    required: true,
    visibility: 'encrypted',
    description: 'Slack app client secret',
  },
  SLACK_SIGNING_SECRET: {
    label: 'Slack Signing Secret',
    scope: 'provision',
    required: true,
    visibility: 'encrypted',
    description: 'Used to verify Events API requests',
  },
  SLACK_BOT_TOKEN: {
    label: 'Slack Bot Token',
    scope: 'install',
    installPhase: 'post_install',
    required: false,
    visibility: 'encrypted',
    description: 'Bot token from OAuth. Set automatically after install.',
  },
  SLACK_TEAM_ID: {
    label: 'Slack Team ID',
    scope: 'install',
    installPhase: 'post_install',
    required: false,
    visibility: 'visible',
  },
  SLACK_TEAM_NAME: {
    label: 'Slack Team Name',
    scope: 'install',
    installPhase: 'post_install',
    required: false,
    visibility: 'visible',
  },
})
