import type { ProvisionHandlerContext, ProvisionHandlerResult } from 'skedyul'
import { instance, webhook } from 'skedyul'
import Mailgun from 'mailgun.js'
import formData from 'form-data'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ROUTE_EXPRESSION = 'match_recipient(".*@skedyul.app")'
const ROUTE_PRIORITY = 10

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ProvisionEnv {
  MAILGUN_API_KEY?: string
}

/**
 * Provision handler for the Email app.
 *
 * This handler runs once per app version deployment and:
 * 1. Creates the skedyul.app domain record (shared across all installations)
 * 2. Sets up Mailgun routes for receiving emails
 */
export default async function provision(
  ctx: ProvisionHandlerContext,
): Promise<ProvisionHandlerResult> {
  const env = ctx.env as ProvisionEnv
  const appVersionId = ctx.app.versionId

  console.log(`[Email Provision] === STARTING PROVISION ===`)
  console.log(`[Email Provision] App Version: ${appVersionId}`)

  // ─────────────────────────────────────────────────────────────────────────
  // Step 1: Create or find the skedyul.app domain
  // ─────────────────────────────────────────────────────────────────────────

  console.log(`[Email Provision] Step 1: Checking for skedyul.app domain...`)

  const existingDomains = await instance.list('email_domain', {
    filter: { domain: 'skedyul.app' },
    limit: 1,
  })

  let domainId: string

  if (existingDomains.data.length > 0) {
    domainId = (existingDomains.data[0] as { id: string }).id
    console.log(`[Email Provision] Using existing domain: ${domainId}`)
  } else {
    const domain = await instance.create('email_domain', {
      domain: 'skedyul.app',
      type: 'SYSTEM',
      status: 'ACTIVE',
    })
    domainId = (domain as { id: string }).id
    console.log(`[Email Provision] Created domain: ${domainId}`)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Step 2: Setup Mailgun Routes
  // ─────────────────────────────────────────────────────────────────────────

  console.log(`[Email Provision] Step 2: Setting up Mailgun routes...`)
  console.log(`[Email Provision] MAILGUN_API_KEY present: ${!!env.MAILGUN_API_KEY}`)

  if (!env.MAILGUN_API_KEY) {
    console.log(`[Email Provision] Skipping Mailgun setup - no API key configured`)
    return {}
  }

  // Check for existing Skedyul webhook registration
  console.log(`[Email Provision] Checking for existing webhook registrations...`)
  const listResult = await webhook.list({ name: 'receive_email' })
  const existingWebhooks = listResult.webhooks
  console.log(`[Email Provision] Found ${existingWebhooks.length} existing registrations`)

  let webhookUrl: string

  if (existingWebhooks.length > 0) {
    // Reuse existing webhook registration
    webhookUrl = existingWebhooks[0].url
    console.log(`[Email Provision] Reusing existing webhook: ${webhookUrl}`)
  } else {
    // Create new webhook registration
    console.log(`[Email Provision] Creating new webhook registration...`)
    const webhookResult = await webhook.create('receive_email')
    webhookUrl = webhookResult.url
    console.log(`[Email Provision] Created webhook: ${webhookUrl}`)
  }

  // Initialize Mailgun client
  console.log(`[Email Provision] Initializing Mailgun client...`)
  const mailgun = new Mailgun(formData)
  const mg = mailgun.client({
    username: 'api',
    key: env.MAILGUN_API_KEY,
  })

  // Check for existing Mailgun route matching this appVersionId
  console.log(`[Email Provision] Fetching existing Mailgun routes...`)
  console.log(`[Email Provision] Looking for route with description: "${appVersionId}"`)

  // Mailgun SDK returns routes as a direct array, not wrapped in { items: [...] }
  type MailgunRoute = {
    id: string
    expression: string
    description?: string
    actions?: string[]
  }
  
  let routesList: MailgunRoute[] = []
  try {
    // Fetch routes - SDK returns array directly
    const response = await mg.routes.list()
    
    // Handle both array response and object with items (SDK version differences)
    if (Array.isArray(response)) {
      routesList = response as MailgunRoute[]
    } else if (response && typeof response === 'object' && 'items' in response) {
      routesList = (response as { items: MailgunRoute[] }).items ?? []
    }
    
    console.log(`[Email Provision] Found ${routesList.length} total Mailgun routes`)
    
    // Log existing route descriptions for debugging
    for (const r of routesList) {
      console.log(`[Email Provision] Route: id="${r.id}", description="${r.description}"`)
    }
  } catch (listError) {
    const errorMessage =
      listError instanceof Error ? listError.message : String(listError)
    throw new Error(`Failed to list Mailgun routes: ${errorMessage}`)
  }

  // Find any route that matches this appVersionId (exact match on description)
  const existingRoute = routesList.find(
    (route) => route.description?.trim() === appVersionId.trim(),
  )
  
  console.log(`[Email Provision] Looking for description: "${appVersionId}"`)
  console.log(`[Email Provision] Existing route found: ${existingRoute ? `id=${existingRoute.id}, desc=${existingRoute.description}` : 'NONE'}`)

  const expectedAction = `store(notify="${webhookUrl}")`

  if (existingRoute) {
    console.log(`[Email Provision] Found matching route: ${existingRoute.id}`)

    // Check if the route already has the correct expression and action
    const currentActions = existingRoute.actions || []
    const currentExpression = existingRoute.expression || ''

    const hasCorrectExpression = currentExpression === ROUTE_EXPRESSION
    const hasCorrectAction = currentActions.some(
      (action) => action === expectedAction,
    )

    if (hasCorrectExpression && hasCorrectAction) {
      console.log(
        `[Email Provision] Route already configured correctly - no changes needed`,
      )
      console.log(`[Email Provision] === COMPLETED ===`)
      return {}
    }

    // Update existing route with new webhook URL
    console.log(`[Email Provision] Updating route with new action...`)
    try {
      await mg.routes.update(existingRoute.id, {
        priority: ROUTE_PRIORITY,
        description: appVersionId,
        expression: ROUTE_EXPRESSION,
        action: [expectedAction],
      })
      console.log(`[Email Provision] Route updated`)
    } catch (updateError) {
      const errorMessage =
        updateError instanceof Error ? updateError.message : String(updateError)
      throw new Error(`Failed to update Mailgun route: ${errorMessage}`)
    }
  } else {
    // Create new Mailgun route
    console.log(`[Email Provision] Creating new Mailgun route...`)
    try {
      await mg.routes.create({
        priority: ROUTE_PRIORITY,
        description: appVersionId,
        expression: ROUTE_EXPRESSION,
        action: [expectedAction],
      })
      console.log(`[Email Provision] Route created`)
    } catch (createError) {
      const errorMessage =
        createError instanceof Error ? createError.message : String(createError)
      throw new Error(`Failed to create Mailgun route: ${errorMessage}`)
    }
  }

  console.log(`[Email Provision] === COMPLETED ===`)
  return {}
}
