/**
 * What a Meta login must include before the install counts as connected.
 *
 * WhatsApp is optional: a business that only uses Messenger or Instagram has
 * no WhatsApp Business Account and must still be able to connect.
 */
export function missingMessagingAssetsError(input: {
  wabaCount: number
  pageCount: number
  instagramAccountCount: number
}): string | null {
  if (input.wabaCount > 0 || input.pageCount > 0 || input.instagramAccountCount > 0) {
    return null
  }
  return 'This Meta login did not include a WhatsApp account, Facebook Page, or Instagram account. Choose at least one when Meta asks. If you just uninstalled, remove Skedyul from Facebook Settings → Business Integrations and install again.'
}
