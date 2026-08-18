import { definePage } from 'skedyul'

export default definePage({
  handle: 'linked_calendars',
  label: 'Linked calendars',
  type: 'instance',
  path: '/calendars/linked',
  navigation: false,
  blocks: [
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Linked calendars',
        description:
          'Google calendars are workplace CRM rows after Import. This app does not keep a separate calendar model.',
      },
      form: {
        id: 'linked-calendars-info-form',
        fields: [
          {
            component: 'Alert',
            id: 'linked-calendars-info',
            row: 0,
            col: 0,
            props: {
              title: 'Use Import, then your workplace calendar model',
              description:
                'Connect only stores Google tokens. Run Import Calendars on the Calendars hub to upsert mapped CRM rows. Live sync lists calendars from the Google API.',
              icon: 'Info',
            },
          },
        ],
        layout: {
          type: 'form',
          rows: [{ columns: [{ field: 'linked-calendars-info', colSpan: 12 }] }],
        },
      },
    },
  ],
})
