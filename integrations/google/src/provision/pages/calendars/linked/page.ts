import { definePage } from 'skedyul'

export default definePage({
  handle: 'linked_calendars',
  label: 'Linked calendars',
  type: 'collection',
  path: '/calendars/linked',
  navigation: false,
  model: 'calendar',
  defaultView: 'table',
})
