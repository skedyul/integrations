import { sendSmsRegistry } from './tools/send-sms'
import { submitComplianceDocumentRegistry } from './tools/submit-compliance-document'
import { checkComplianceStatusRegistry } from './tools/check-compliance-status'
import type { ToolRegistry } from 'skedyul'

export const registry: ToolRegistry = {
  send_sms: sendSmsRegistry,
  submit_compliance_document: submitComplianceDocumentRegistry,
  check_compliance_status: checkComplianceStatusRegistry,
}

export type ToolName = keyof typeof registry

export type { ToolContext, ToolHandler } from 'skedyul'
