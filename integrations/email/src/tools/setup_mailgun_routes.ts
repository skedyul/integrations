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

    console.log(`[SetupMailgunRoutes] === STARTING PROVISION ===`)
    console.log(`[SetupMailgunRoutes] trigger: ${context.trigger}`)
    console.log(`[SetupMailgunRoutes] MAILGUN_API_KEY present: ${!!env.MAILGUN_API_KEY}`)

    if (!env.MAILGUN_API_KEY) {
      console.error(`[SetupMailgunRoutes] ERROR: MAILGUN_API_KEY is missing`)
      throw new Error('MAILGUN_API_KEY is required')
    }

    // Step 1: Check for existing Skedyul webhook registration
    console.log(`[SetupMailgunRoutes] Step 1: Checking for existing webhook registrations...`)
    const listResult = await webhook.list({ name: "receive_email" })
    const existingWebhooks = listResult.webhooks
    console.log(`[SetupMailgunRoutes] Found ${existingWebhooks.length} existing registrations`)
    
    let webhookUrl: string
    let webhookRegistrationId: string

    if (existingWebhooks.length > 0) {
      // Reuse existing webhook registration
      webhookUrl = existingWebhooks[0].url
      webhookRegistrationId = existingWebhooks[0].id
      console.log(`[SetupMailgunRoutes] Reusing existing registration:`)
      console.log(`[SetupMailgunRoutes]   ID: ${webhookRegistrationId}`)
      console.log(`[SetupMailgunRoutes]   URL: ${webhookUrl}`)
    } else {
      // Create new webhook registration
      console.log(`[SetupMailgunRoutes] No existing registration found, creating new one...`)
      const webhookResult = await webhook.create("receive_email")
      webhookUrl = webhookResult.url
      webhookRegistrationId = webhookResult.id
      console.log(`[SetupMailgunRoutes] Created new registration:`)
      console.log(`[SetupMailgunRoutes]   ID: ${webhookRegistrationId}`)
      console.log(`[SetupMailgunRoutes]   URL: ${webhookUrl}`)
    }

    // Step 2: Initialize Mailgun client
    console.log(`[SetupMailgunRoutes] Step 2: Initializing Mailgun client...`)
    const mailgun = new Mailgun(formData)
    const mg = mailgun.client({
      username: 'api',
      key: env.MAILGUN_API_KEY,
    })
    console.log(`[SetupMailgunRoutes] Mailgun client initialized`)

    // Step 3: Check for existing Mailgun route matching our expression
    console.log(`[SetupMailgunRoutes] Step 3: Fetching existing Mailgun routes...`)
    console.log(`[SetupMailgunRoutes] Looking for expression: ${ROUTE_EXPRESSION}`)
    
    const routes = await mg.routes.list()
    console.log(`[SetupMailgunRoutes] Found ${routes.items?.length ?? 0} total Mailgun routes`)
    
    // Log all routes for debugging
    if (routes.items && routes.items.length > 0) {
      console.log(`[SetupMailgunRoutes] Existing routes:`)
      routes.items.forEach((r: { id: string; expression: string; actions?: string[] }, i: number) => {
        console.log(`[SetupMailgunRoutes]   [${i}] ID: ${r.id}, Expression: ${r.expression}`)
      })
    }
    
    const existingRoute = routes.items?.find(
      (route: { expression: string; id: string }) => route.expression === ROUTE_EXPRESSION
    )

    const expectedAction = `store(notify="${webhookUrl}")`
    console.log(`[SetupMailgunRoutes] Expected action: ${expectedAction}`)

    if (existingRoute) {
      console.log(`[SetupMailgunRoutes] Found matching route: ${existingRoute.id}`)
      
      // Check if the route already has the correct action
      const currentActions = existingRoute.actions || []
      console.log(`[SetupMailgunRoutes] Current actions: ${JSON.stringify(currentActions)}`)
      
      const hasCorrectAction = currentActions.some(
        (action: string) => action === expectedAction
      )

      if (hasCorrectAction) {
        console.log(`[SetupMailgunRoutes] Route already configured correctly - no changes needed`)
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
      console.log(`[SetupMailgunRoutes] Updating route with new action...`)
      const updatePayload = {
        priority: ROUTE_PRIORITY,
        description: webhookRegistrationId,
        expression: ROUTE_EXPRESSION,
        action: [expectedAction],
      }
      console.log(`[SetupMailgunRoutes] Update payload: ${JSON.stringify(updatePayload)}`)
      
      const updateResult = await mg.routes.update(existingRoute.id, updatePayload)
      console.log(`[SetupMailgunRoutes] Update result: ${JSON.stringify(updateResult)}`)

      console.log(`[SetupMailgunRoutes] === COMPLETED: UPDATED ===`)
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
    console.log(`[SetupMailgunRoutes] No matching route found, creating new one...`)
    const createPayload = {
      priority: ROUTE_PRIORITY,
      description: webhookRegistrationId,
      expression: ROUTE_EXPRESSION,
      action: [expectedAction],
    }
    console.log(`[SetupMailgunRoutes] Create payload: ${JSON.stringify(createPayload)}`)
    
    const route = await mg.routes.create(createPayload)
    console.log(`[SetupMailgunRoutes] Create result: ${JSON.stringify(route)}`)

    console.log(`[SetupMailgunRoutes] === COMPLETED: CREATED ===`)
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
