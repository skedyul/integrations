export type SmsEncoding = 'GSM-7' | 'UCS-2'

/** Twilio AU outbound SMS base rate per segment (USD). */
export const TWILIO_AU_COST_PER_SEGMENT_USD = 0.0515

/** Retail markup over Twilio cost. */
export const SMS_MARGIN_MULTIPLIER = 1.4

/** AU retail price per segment in cents (Twilio + 40% margin, rounded). */
export const AU_PRICE_PER_SEGMENT_CENTS = Math.round(
  TWILIO_AU_COST_PER_SEGMENT_USD * SMS_MARGIN_MULTIPLIER * 100,
)

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
