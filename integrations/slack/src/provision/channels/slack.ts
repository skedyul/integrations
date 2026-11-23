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
    // DMs to the Skedyul app go to Ask Skedyul. Channel and group messages
    // keep the messaging path above. The Slack team belongs to one workplace,
    // and the sender is matched to a member by their Slack profile email.
    askSkedyul: {
      label: 'Slack',
      icon: 'MessageSquare',
      conversations: ['direct'],
      addressing: 'installation',
      matchMemberBy: ['email'],
      send: 'send_slack',
    },
  },
})
