import { randomUUID } from 'node:crypto'
import type { OAuth2Client } from 'google-auth-library'
import { google } from 'googleapis'
import { mapGoogleAuthError } from '../../lib/google_client'

export interface GoogleWatchChannel {
  channelId: string
  resourceId: string
  expiration: string | null
  token: string
}

export async function startCalendarWatch(
  auth: OAuth2Client,
  options: {
    calendarId: string
    webhookUrl: string
    channelId?: string
    token?: string
  },
): Promise<GoogleWatchChannel> {
  const channelId = options.channelId ?? randomUUID()
  const token = options.token ?? randomUUID()

  try {
    const calendar = google.calendar({ version: 'v3', auth })
    const response = await calendar.events.watch({
      calendarId: options.calendarId,
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: options.webhookUrl,
        token,
      },
    })

    return {
      channelId: response.data.id || channelId,
      resourceId: response.data.resourceId || '',
      expiration: response.data.expiration
        ? new Date(Number(response.data.expiration)).toISOString()
        : null,
      token,
    }
  } catch (error) {
    throw mapGoogleAuthError(error)
  }
}

export async function stopCalendarWatch(
  auth: OAuth2Client,
  options: {
    channelId: string
    resourceId: string
  },
): Promise<void> {
  try {
    const calendar = google.calendar({ version: 'v3', auth })
    await calendar.channels.stop({
      requestBody: {
        id: options.channelId,
        resourceId: options.resourceId,
      },
    })
  } catch (error) {
    console.warn('[Google] Failed to stop calendar watch channel:', error)
  }
}

export function watchNeedsRenewal(expiration: string | null | undefined): boolean {
  if (!expiration) {
    return true
  }

  const expiryMs = Date.parse(expiration)
  if (!Number.isFinite(expiryMs)) {
    return true
  }

  return expiryMs <= Date.now() + 24 * 60 * 60 * 1000
}
