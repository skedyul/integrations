/**
 * Page webhook subscriptions.
 *
 * Meta only delivers a Page's Messenger events, and the Instagram DMs of the
 * account linked to that Page, after the app is subscribed to the Page with
 * `POST /{page-id}/subscribed_apps`. The app-level subscription made at
 * provision time is not enough on its own.
 */

export const PAGE_MESSAGING_FIELDS = ['messages', 'messaging_postbacks', 'message_reads'] as const

export const PAGE_LEADGEN_FIELD = 'leadgen'

/** Posts `subscribed_fields` to `/{page-id}/subscribed_apps`. Throws on a Graph error. */
export type PostPageSubscribedFields = (fields: string[]) => Promise<void>

export type PageSubscriptionResult = {
  fields: string[]
  leadgen: boolean
  leadgenError?: string
}

/**
 * Subscribe a Page to messaging and lead-form events.
 *
 * `leadgen` needs `leads_retrieval`, which an install may not grant. Each POST
 * replaces the Page's field list, so when the combined call fails we retry with
 * the messaging fields alone. Messages must not depend on lead forms.
 */
export async function subscribePageFields(
  post: PostPageSubscribedFields,
): Promise<PageSubscriptionResult> {
  const withLeadgen = [...PAGE_MESSAGING_FIELDS, PAGE_LEADGEN_FIELD]
  try {
    await post(withLeadgen)
    return { fields: withLeadgen, leadgen: true }
  } catch (err) {
    const messagingOnly = [...PAGE_MESSAGING_FIELDS]
    await post(messagingOnly)
    return {
      fields: messagingOnly,
      leadgen: false,
      leadgenError: err instanceof Error ? err.message : String(err),
    }
  }
}
