import { GoogleServiceNotEnabledError } from '../types'

export function notEnabled(): never {
  throw new GoogleServiceNotEnabledError('gmail')
}
