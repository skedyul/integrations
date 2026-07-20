export type GoogleService = 'calendar' | 'gmail' | 'drive'

export class GoogleServiceNotEnabledError extends Error {
  constructor(service: GoogleService) {
    super(`Google ${service} service is not enabled yet`)
    this.name = 'GoogleServiceNotEnabledError'
  }
}
