import { instance } from 'skedyul'
import type { WebhookDefinition, WebhookRequest, WebhookResponse, WebhookContext } from 'skedyul'
import { URLSearchParams } from 'url'
import twilio from 'twilio'
import { getHeaderValue, serializeBody } from './lib/helpers'

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Handler
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle incoming voice calls from Twilio.
 *
 * Validates the Twilio signature, looks up the forwarding number from the
 * phone_number model, and returns TwiML to forward the call.
 *
 * Supports both GET and POST requests:
 * - GET: Twilio sends data as query parameters
 * - POST: Twilio sends data as form-urlencoded body
 */
async function handleReceiveCall(
  request: WebhookRequest,
  context: WebhookContext,
): Promise<WebhookResponse> {
  const { headers, method } = request
  const isGetRequest = method === 'GET'

  // For GET requests, params come from query string
  // For POST requests, params come from form-urlencoded body
  let paramsObject: Record<string, string>
  if (isGetRequest) {
    paramsObject = request.query ?? {}
  } else {
    const rawBody = serializeBody(request.body)
    const params = new URLSearchParams(rawBody)
    paramsObject = Object.fromEntries(params.entries())
  }

  // Validate Twilio signature
  const twilioSignature =
    getHeaderValue(headers, 'x-twilio-signature') ??
    getHeaderValue(headers, 'X-Twilio-Signature')

  if (!twilioSignature) {
    console.log('[receiveCall] Missing Twilio signature')
    return {
      status: 401,
      body: { error: 'Missing Twilio signature' },
    }
  }

  const twilioAuthToken = context.env.TWILIO_AUTH_TOKEN
  if (!twilioAuthToken) {
    console.error('[receiveCall] TWILIO_AUTH_TOKEN is not configured')
    return {
      status: 500,
      body: { error: 'TWILIO_AUTH_TOKEN is not configured' },
    }
  }

  // Use request.url directly - the envelope format passes the original URL
  let webhookUrl = request.url
  if (!webhookUrl) {
    return {
      status: 400,
      body: { error: 'Missing webhook URL' },
    }
  }

  // Handle ngrok URL substitution for local development
  const ngrokUrl = context.env.NGROK_DEVELOPER_URL
  if (ngrokUrl) {
    try {
      const parsed = new URL(webhookUrl)
      parsed.hostname = ngrokUrl
      webhookUrl = parsed.toString()
    } catch {
      // fall back to original URL if parsing fails
    }
  }

  // For GET requests, Twilio signature is validated against the full URL (with query params)
  // with an empty params object. The route.ts now includes the original query string in request.url.
  // For POST, it's validated against the base URL + body params.
  const signatureUrl = webhookUrl
  const signatureParams = isGetRequest ? {} : paramsObject

  const isValid = twilio.validateRequest(
    twilioAuthToken,
    twilioSignature,
    signatureUrl,
    signatureParams,
  )

  if (!isValid) {
    console.log('[receiveCall] Invalid Twilio signature', {
      method,
      signatureUrl,
      hasQueryInUrl: signatureUrl.includes('?'),
      signatureParamsCount: Object.keys(signatureParams).length,
    })
    return {
      status: 403,
      body: { error: 'Invalid Twilio signature' },
    }
  }

  // Twilio voice calls use 'To' (or 'Called') for the dialed number
  const to = paramsObject.To ?? paramsObject.Called ?? ''
  const from = paramsObject.From ?? paramsObject.Caller ?? ''

  if (!to) {
    console.log('[receiveCall] Missing To/Called parameter')
    return {
      status: 400,
      headers: { 'Content-Type': 'application/xml' },
      body: '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Invalid request</Say></Response>',
    }
  }

  // Look up the phone number in our model
  const searchResult = await instance.list('phone_number', {
    filter: { phone: to },
    limit: 1,
  })

  const phoneRecord = searchResult.data[0] as unknown as
    | {
        forwarding_phone_number?: string | null
        phone: string
      }
    | undefined

  if (!phoneRecord || !phoneRecord.forwarding_phone_number) {
    console.log('[receiveCall] No forwarding number configured for', to)
    return {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
      body: '<?xml version="1.0" encoding="UTF-8"?><Response><Say>This number is not configured to receive calls.</Say></Response>',
    }
  }

  console.log(
    '[receiveCall] Forwarding call from',
    from,
    'to',
    phoneRecord.phone,
    '-> forwarding to',
    phoneRecord.forwarding_phone_number,
  )

  // Return TwiML to forward the call
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${phoneRecord.phone}">${phoneRecord.forwarding_phone_number}</Dial>
</Response>`

  return {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
    },
    body: twiml,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Registry Export
// ─────────────────────────────────────────────────────────────────────────────

export const receiveCallRegistry: WebhookDefinition = {
  name: 'receive_call',
  description: 'Forward inbound voice calls to the configured forwarding number',
  methods: ['GET', 'POST'], // Twilio can use either method
  type: 'CALLBACK', // Must return TwiML to Twilio
  handler: handleReceiveCall,
}
