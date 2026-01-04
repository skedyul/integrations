import twilio from 'twilio'

export const createTwilioClient = (env: Record<string, string | undefined>) => {
  const accountSid = env.TWILIO_ACCOUNT_SID
  const authToken = env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) {
    throw new Error(
      'Missing Twilio credentials: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN required',
    )
  }

  return twilio(accountSid, authToken)
}
