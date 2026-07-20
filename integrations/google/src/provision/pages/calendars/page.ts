import { definePage } from 'skedyul'

export default definePage({
  handle: 'calendars',
  label: 'Calendars',
  type: 'collection',
  path: '/calendars',
  navigation: true,
  model: 'google_calendar',
  defaultView: 'table',
})
