/** Provision env key — when "true", compliance and number tools skip Twilio. */
export const MOCK_COMPLIANCE_AND_NUMBER_ENV = 'MOCK_COMPLIANCE_AND_NUMBER'

/** @deprecated Renamed from ENABLE_TEST_COMPLIANCE_AND_NUMBER — still honored for existing installs. */
const LEGACY_MOCK_COMPLIANCE_ENV = 'ENABLE_TEST_COMPLIANCE_AND_NUMBER'

export function isMockComplianceAndNumberEnabled(
  env: Record<string, string | undefined>,
): boolean {
  return (
    env[MOCK_COMPLIANCE_AND_NUMBER_ENV] === 'true' ||
    env[LEGACY_MOCK_COMPLIANCE_ENV] === 'true'
  )
}
