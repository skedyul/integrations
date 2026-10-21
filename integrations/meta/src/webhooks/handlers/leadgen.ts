import { event, instance } from 'skedyul'
import { MetaClient } from '../../lib/meta_client'
import { loadInstanceAccessToken } from '../../lib/inbound_message'
import type { MetaWebhookEntry } from '../../lib/meta_webhook/types'

type LeadField = { name?: string; values?: string[] }

function fieldValue(fields: LeadField[] | undefined, names: string[]): string | undefined {
  const wanted = new Set(names.map((name) => name.toLowerCase()))
  const match = fields?.find((field) => field.name && wanted.has(field.name.toLowerCase()))
  const value = match?.values?.find((entry) => entry.trim().length > 0)
  return value?.trim()
}

/**
 * Store a Lead Ads submission and emit meta.lead.received.
 * Does not open a conversation or send a message.
 */
export async function handleLeadgenWebhookEntries(
  entries: MetaWebhookEntry[] | undefined,
): Promise<void> {
  for (const entry of entries ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'leadgen') continue
      const leadgenId = change.value?.leadgen_id
      const pageId = change.value?.page_id ?? entry.id
      if (!leadgenId || !pageId) continue
      try {
        await storeLead({
          leadgenId,
          pageId,
          formId: change.value?.form_id,
          adId: change.value?.ad_id,
        })
      } catch (err) {
        console.error('[receiveMeta:leadgen] Failed to store lead:', err)
      }
    }
  }
}

async function storeLead(input: {
  leadgenId: string
  pageId: string
  formId?: string
  adId?: string
}): Promise<void> {
  const pages = await instance.list('facebook_page', {
    filter: { page_id: input.pageId },
    limit: 1,
  })
  const page = pages.data[0] as { id?: string } | undefined
  if (!page?.id) {
    console.log(`[receiveMeta:leadgen] No facebook_page for ${input.pageId}`)
    return
  }

  const accessToken = await loadInstanceAccessToken('facebook_page', page.id)
  const META_APP_ID = process.env.META_APP_ID
  const META_APP_SECRET = process.env.META_APP_SECRET
  const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION
  if (!accessToken || !META_APP_ID || !META_APP_SECRET || !GRAPH_API_VERSION) {
    console.log('[receiveMeta:leadgen] Missing page token or Meta app credentials')
    return
  }

  const client = new MetaClient(META_APP_ID, META_APP_SECRET, GRAPH_API_VERSION)
  const lead = await client.getLead(input.leadgenId, accessToken)
  const email = fieldValue(lead.field_data, ['email'])
  const phone = fieldValue(lead.field_data, ['phone', 'phone_number'])
  const fullName = fieldValue(lead.field_data, ['full_name', 'name'])

  const record = {
    leadgen_id: input.leadgenId,
    form_id: lead.form_id ?? input.formId ?? null,
    ad_id: lead.ad_id ?? input.adId ?? null,
    page_id: input.pageId,
    full_name: fullName ?? null,
    email: email ?? null,
    phone: phone ?? null,
    field_data: lead.field_data ?? null,
  }

  const existing = await instance.list('meta_lead', {
    filter: { leadgen_id: input.leadgenId },
    limit: 1,
  })
  const existingId = (existing.data[0] as { id?: string } | undefined)?.id
  if (existingId) {
    await instance.update('meta_lead', existingId, record)
  } else {
    await instance.create('meta_lead', record)
  }

  await event.create('meta.lead.received', {
    leadgenId: input.leadgenId,
    pageId: input.pageId,
    formId: record.form_id,
    adId: record.ad_id,
    email: email ?? null,
    phone: phone ?? null,
    fullName: fullName ?? null,
  })
}
