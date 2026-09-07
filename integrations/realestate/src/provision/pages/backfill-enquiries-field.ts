/**
 * Shared Setup / Agencies / Enquiries control for GET-backfilling REA leads.
 */

export const backfillEnquiriesPageAction = {
  handle: 'backfill_enquiries',
  label: 'Backfill REA enquiries',
  handler: 'backfill_enquiries',
  icon: 'Download',
  variant: 'secondary' as const,
}

export function backfillEnquiriesFieldSetting(row: number) {
  return {
    component: 'fieldsetting' as const,
    id: 'backfill_enquiries',
    row,
    col: 0,
    label: 'Backfill missed enquiries',
    description:
      'GET REA /lead/v1/enquiries and re-emit enquiry.created for leads CRM does not already have. Dry-run first.',
    mode: 'field' as const,
    button: {
      label: 'Backfill enquiries',
      variant: 'outline' as const,
      size: 'sm' as const,
    },
    modalForm: {
      header: {
        title: 'Backfill REA enquiries',
        description:
          'Pulls the Leads API (paginated HAL) and emits enquiry.created for rows not already matched on rea_enquiry_id. Leave dry-run checked to preview.',
      },
      handler: 'backfill_enquiries',
      fields: [
        {
          component: 'alert',
          id: 'backfill-info',
          row: 0,
          col: 0,
          title: 'Does not replay REA webhooks',
          description:
            'EnquiryCreated is never retried after HTTP 200. This reads GET /lead/v1/enquiries?since=… instead. Live webhooks still need an ACTIVE CRM agency.',
          icon: 'Info',
          variant: 'default',
        },
        {
          component: 'input',
          id: 'since',
          row: 1,
          col: 0,
          label: 'Since',
          placeholder: '2026-09-04T00:14:00Z',
          helpText: 'ISO timestamp or YYYY-MM-DD. Required.',
          required: true,
        },
        {
          component: 'input',
          id: 'until',
          row: 2,
          col: 0,
          label: 'Until',
          placeholder: 'Optional, defaults to now',
          helpText: 'ISO timestamp or YYYY-MM-DD. Date-only is treated as end of that UTC day.',
          required: false,
        },
        {
          component: 'input',
          id: 'agency_id',
          row: 3,
          col: 0,
          label: 'Agency ID',
          placeholder: 'GHBDWE',
          helpText: 'Optional 6-letter REA agency id. Empty = every Ignite-authorized agency.',
          required: false,
        },
        {
          component: 'input',
          id: 'limit',
          row: 4,
          col: 0,
          type: 'number',
          label: 'Limit',
          placeholder: '200',
          helpText: 'Max enquiries to emit. Defaults to 200.',
          required: false,
        },
        {
          component: 'checkbox',
          id: 'dry_run',
          row: 5,
          col: 0,
          label: 'Dry run (preview only)',
          helpText: 'Uncheck to emit enquiry.created for missing leads.',
          checked: true,
        },
      ],
      layout: {
        type: 'form',
        rows: [
          { columns: [{ field: 'backfill-info', colSpan: 12 }] },
          { columns: [{ field: 'since', colSpan: 12 }] },
          { columns: [{ field: 'until', colSpan: 12 }] },
          { columns: [{ field: 'agency_id', colSpan: 6 }, { field: 'limit', colSpan: 6 }] },
          { columns: [{ field: 'dry_run', colSpan: 12 }] },
        ],
      },
      actions: [
        {
          handle: 'backfill_enquiries',
          label: 'Run backfill',
          handler: 'backfill_enquiries',
          icon: 'Download',
          variant: 'primary',
        },
      ],
    },
  }
}
