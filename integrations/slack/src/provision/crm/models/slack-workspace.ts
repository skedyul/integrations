import { defineModel } from 'skedyul'

export default defineModel({
  handle: 'slack_workspace',
  label: 'Slack Workspace',
  labelPlural: 'Slack Workspaces',
  labelTemplate: '{{ team_name }}',
  description: 'Connected Slack workspace',
  scope: 'internal',
  fields: [
    {
      handle: 'team_id',
      label: 'Team ID',
      type: 'string',
      requirement: 'required',
      unique: true,
      system: true,
      owner: 'app',
    },
    {
      handle: 'team_name',
      label: 'Team Name',
      type: 'string',
      requirement: 'optional',
      system: true,
      owner: 'app',
    },
  ],
  env: {
    ACCESS_TOKEN: {
      label: 'Bot token',
      visibility: 'encrypted',
      description: 'Copied at OAuth so inbound events can look up Slack users',
    },
  },
})
