import { receiveSmsRegistry, receiveSmsV2Registry } from './receive-sms'
import { complianceStatusRegistry } from './compliance-status'
import type { WebhookRegistry } from 'skedyul'

export const registry: WebhookRegistry = {
  receive_sms: receiveSmsRegistry,
  receive_sms_v2: receiveSmsV2Registry,
  compliance_status: complianceStatusRegistry,
}

export type WebhookName = keyof typeof registry
