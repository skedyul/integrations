const GENERIC_HISTORY_TITLE = 'Patient History from Skedyul'

/**
 * Visible Petbooqz history title.
 * A caller-supplied lab reference wins so vets can scan the subject.
 * source_report_id only supplies the legacy unique title when the caller
 * still sends the generic placeholder.
 */
export function buildPatientHistoryTitle(
  title: string,
  sourceReportId?: string,
): string {
  const trimmed = title.trim()
  if (trimmed && trimmed !== GENERIC_HISTORY_TITLE) {
    return trimmed
  }
  if (sourceReportId) {
    return `Skedyul Report ${sourceReportId}`
  }
  return trimmed || 'Pathology Result'
}

/**
 * Titles that mean this report was already written to Petbooqz.
 * Includes the legacy `Skedyul Report {id}` subject so a re-run does not
 * add a second note for histories created while that format was live.
 */
export function historyLookupTitles(
  title: string,
  sourceReportId?: string,
): string[] {
  const visible = buildPatientHistoryTitle(title, sourceReportId)
  const titles = [visible]
  if (sourceReportId) {
    const legacy = `Skedyul Report ${sourceReportId}`
    if (legacy !== visible) {
      titles.push(legacy)
    }
  }
  return titles
}
