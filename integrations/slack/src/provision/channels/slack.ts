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
  },
})
