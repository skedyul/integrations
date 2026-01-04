import { sendSmsRegistry } from './tools/send-sms'
import type { ToolRegistry } from 'skedyul'

export const registry: ToolRegistry = {
  send_sms: sendSmsRegistry,
}

export type ToolName = keyof typeof registry

export type { ToolContext, ToolHandler } from 'skedyul'
