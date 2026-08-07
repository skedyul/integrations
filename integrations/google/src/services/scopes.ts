import type { GoogleService } from './types'

export interface GoogleServiceScopeConfig {
  service: GoogleService
  enabled: boolean
  scopes: string[]
  description: string
}

export const GOOGLE_SERVICE_SCOPES: GoogleServiceScopeConfig[] = [
  {
    service: 'calendar',
    enabled: true,
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    description: 'Google Calendar read/write and account email',
  },
  {
    service: 'gmail',
    enabled: false,
    scopes: ['https://www.googleapis.com/auth/gmail.modify'],
    description: 'Gmail (not enabled in v1)',
  },
  {
    service: 'drive',
    enabled: false,
    scopes: ['https://www.googleapis.com/auth/drive'],
    description: 'Google Drive (not enabled in v1)',
  },
]

export function getEnabledServices(): GoogleService[] {
  return GOOGLE_SERVICE_SCOPES.filter((entry) => entry.enabled).map((entry) => entry.service)
}

export function getOAuthScopesForServices(services: GoogleService[]): string[] {
  const scopeSet = new Set<string>()

  for (const service of services) {
    const config = GOOGLE_SERVICE_SCOPES.find((entry) => entry.service === service)
    if (!config?.enabled) {
      continue
    }
    for (const scope of config.scopes) {
      scopeSet.add(scope)
    }
  }

  return [...scopeSet]
}

export function getDefaultOAuthScopes(): string[] {
  return getOAuthScopesForServices(getEnabledServices())
}

export function parseEnabledServices(raw: string | undefined): GoogleService[] {
  if (!raw) {
    return getEnabledServices()
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return getEnabledServices()
    }

    return parsed.filter(
      (value): value is GoogleService =>
        value === 'calendar' || value === 'gmail' || value === 'drive',
    )
  } catch {
    return getEnabledServices()
  }
}
