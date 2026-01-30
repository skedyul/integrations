/**
 * Setup Mailgun Routes Tool
 * =========================
 *
 * Provision lifecycle tool that creates or updates Mailgun routes for receiving emails.
 * Called automatically when the webhook is provisioned.
 *
 * This tool is idempotent - safe to run multiple times:
 * 1. Check for existing Skedyul webhook registration via webhook.list
 * 2. Reuse existing registration or create a new one
 * 3. Check Mailgun for existing route matching the expression
 * 4. Update existing route or create new one
 */

import { z, webhook, type z as ZodType } from 'skedyul'
import type { ToolDefinition, ProvisionToolContext, ToolExecutionContext } from 'skedyul'
import Mailgun from 'mailgun.js'
import formData from 'form-data'
import type { EmailEnv } from '../lib/email_provider'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ROUTE_EXPRESSION = 'match_recipient(".*@skedyul.app")'
const ROUTE_PRIORITY = 10

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────

const SetupMailgunRoutesInputSchema = z.object({})

const SetupMailgunRoutesOutputSchema = z.object({
  success: z.boolean(),
  routeId: z.string().optional().describe('Mailgun route ID'),
  webhookUrl: z.string().optional().describe('The webhook URL configured in Mailgun'),
  action: z.enum(['created', 'updated', 'unchanged']).describe('What action was taken'),
})

type SetupMailgunRoutesOutput = ZodType.infer<typeof SetupMailgunRoutesOutputSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Tool Definition
// ─────────────────────────────────────────────────────────────────────────────

export const setupMailgunRoutesRegistry: ToolDefinition<
  Record<string, never>,
  SetupMailgunRoutesOutput
> = {
  name: 'setup_mailgun_routes',
  description: 'Creates or updates Mailgun routes for receiving emails during webhook provisioning',
  inputs: SetupMailgunRoutesInputSchema,
  outputSchema: SetupMailgunRoutesOutputSchema,

  handler: async (_input, rawContext: ToolExecutionContext) => {
    // Cast to ProvisionToolContext - this tool is only called during provisioning
    const context = rawContext as ProvisionToolContext
    const env = context.env as EmailEnv

    if (!env.MAILGUN_API_KEY) {
      throw new Error('MAILGUN_API_KEY is required')
    }

    console.log(`[SetupMailgunRoutes] Starting provisioning for webhook: ${context.webhookName}`)

    // Step 1: Check for existing Skedyul webhook registration
    const { webhooks: existingWebhooks } = await webhook.list({ name: context.webhookName })
    
    let webhookUrl: string
    let webhookRegistrationId: string

    if (existingWebhooks.length > 0) {
      // Reuse existing webhook registration
      webhookUrl = existingWebhooks[0].url
      webhookRegistrationId = existingWebhooks[0].id
      console.log(`[SetupMailgunRoutes] Found existing webhook registration: ${webhookRegistrationId} -> ${webhookUrl}`)
    } else {
      // Create new webhook registration
      const webhookResult = await webhook.create(context.webhookName)
      webhookUrl = webhookResult.url
      webhookRegistrationId = webhookResult.id
      console.log(`[SetupMailgunRoutes] Created new webhook registration: ${webhookRegistrationId} -> ${webhookUrl}`)
    }

    // Step 2: Initialize Mailgun client
    const mailgun = new Mailgun(formData)
    const mg = mailgun.client({
      username: 'api',
      key: env.MAILGUN_API_KEY,
    })

    // Step 3: Check for existing Mailgun route matching our expression
    const routes = await mg.routes.list()
    const existingRoute = routes.items.find(
      (route: { expression: string; id: string }) => route.expression === ROUTE_EXPRESSION
    )

    const expectedAction = `store(notify="${webhookUrl}")`

    if (existingRoute) {
      // Check if the route already has the correct action
      const currentActions = existingRoute.actions || []
      const hasCorrectAction = currentActions.some(
        (action: string) => action === expectedAction
      )

      if (hasCorrectAction) {
        console.log(`[SetupMailgunRoutes] Route already configured correctly: ${existingRoute.id}`)
        return {
          output: {
            success: true,
            routeId: existingRoute.id,
            webhookUrl,
            action: 'unchanged',
          },
          billing: { credits: 0 },
        }
      }

      // Update existing route with new webhook URL
      console.log(`[SetupMailgunRoutes] Updating existing route: ${existingRoute.id}`)
      await mg.routes.update(existingRoute.id, {
        priority: ROUTE_PRIORITY,
        description: webhookRegistrationId,
        expression: ROUTE_EXPRESSION,
        action: [expectedAction],
      })

      console.log(`[SetupMailgunRoutes] Updated Mailgun route: ${existingRoute.id}`)

      return {
        output: {
          success: true,
          routeId: existingRoute.id,
          webhookUrl,
          action: 'updated',
        },
        billing: { credits: 0 },
      }
    }

    // Step 4: Create new Mailgun route
    const route = await mg.routes.create({
      priority: ROUTE_PRIORITY,
      description: webhookRegistrationId,
      expression: ROUTE_EXPRESSION,
      action: [expectedAction],
    })

    console.log(`[SetupMailgunRoutes] Created Mailgun route: ${route.id}`)

    return {
      output: {
        success: true,
        routeId: route.id,
        webhookUrl,
        action: 'created',
      },
      billing: { credits: 0 },
    }
  },
}
