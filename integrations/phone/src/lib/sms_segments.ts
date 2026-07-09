export type SmsEncoding = 'GSM-7' | 'UCS-2'

/** Default retail price per SMS segment (USD). Overridable via COST_PER_SMS provision env. */
export const DEFAULT_COST_PER_SMS = '0.07'

export function parseCostPerSmsDollars(value?: string | null): number {
  const parsed = parseFloat(value ?? DEFAULT_COST_PER_SMS)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return parseFloat(DEFAULT_COST_PER_SMS)
  }
  return parsed
}

export function parseCostPerSmsCents(value?: string | null): number {
  return Math.round(parseCostPerSmsDollars(value) * 100)
}

/** Default AU retail price per segment in cents (matches DEFAULT_COST_PER_SMS). */
export const AU_PRICE_PER_SEGMENT_CENTS = parseCostPerSmsCents()

const GSM_7_BASIC_CHARS =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'

const GSM_7_BASIC = new Set(GSM_7_BASIC_CHARS.split(''))
const GSM_7_EXTENDED = new Set(['|', '^', '€', '{', '}', '[', ']', '~', '\\'])

function gsm7CodeUnits(text: string): number | null {
  let length = 0
  for (const char of text) {
    if (GSM_7_BASIC.has(char)) {
      length += 1
    } else if (GSM_7_EXTENDED.has(char)) {
      length += 2
    } else {
      return null
    }
  }
  return length
}

export function detectSmsEncoding(text: string): SmsEncoding {
  return gsm7CodeUnits(text) === null ? 'UCS-2' : 'GSM-7'
}

export function countSmsSegments(text: string): {
  encoding: SmsEncoding
  segments: number
} {
  const gsmLength = gsm7CodeUnits(text)
  if (gsmLength !== null) {
    if (gsmLength <= 160) {
      return { encoding: 'GSM-7', segments: 1 }
    }
    return { encoding: 'GSM-7', segments: Math.ceil(gsmLength / 153) }
  }

  const ucsLength = [...text].length
  if (ucsLength <= 70) {
    return { encoding: 'UCS-2', segments: 1 }
  }
  return { encoding: 'UCS-2', segments: Math.ceil(ucsLength / 67) }
}

export function segmentsToCostCents(
  segments: number,
  pricePerSegmentCents: number = AU_PRICE_PER_SEGMENT_CENTS,
): number {
  return Math.round(segments * pricePerSegmentCents)
}
