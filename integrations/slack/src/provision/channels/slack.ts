import { defineChannel } from 'skedyul'

export default defineChannel({
  handle: 'slack',
  label: 'Slack',
  icon: 'MessageSquare',

  fields: [
    {
      handle: 'slack_user_id',
      label: 'Slack User',
      identifier: true,
      definition: 'string',
      visibility: { data: true, list: true, filters: true },
    },
  ],

  capabilities: {
    messaging: {
      label: 'Slack',
      icon: 'MessageSquare',
      receive: 'receive_slack',
      send: 'send_slack',
    },
    // Each Slack workspace is one workplace's own team, so every Slack
    // conversation is an Ask Skedyul thread: DMs reply to everything,
    // channels reply when the app is @mentioned (all messages are kept for
    // context). Senders are matched to members by Slack profile email.
    askSkedyul: {
      label: 'Slack',
      icon: 'MessageSquare',
      conversations: ['direct', 'group'],
      addressing: 'installation',
      matchMemberBy: ['email'],
      groupReplies: 'mentioned',
      send: 'send_slack',
    },
  },
})
