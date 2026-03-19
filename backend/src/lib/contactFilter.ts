/**
 * Detects and optionally masks direct contact information in user-generated text.
 * Applied server-side to proposals, demands and correspondent requests.
 */

const CONTACT_PATTERNS = [
  // Phone numbers: (11) 99999-9999, 11999999999, +55 11 99999-9999
  /(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)(?:9\s?)?\d{4}[\s\-]?\d{4}/g,
  // E-mail addresses
  /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
  // WhatsApp explicit mentions
  /whatsapp|wpp|zap\s*:/gi,
  // Telegram
  /t\.me\/[a-zA-Z0-9_]+/gi,
  // Instagram @handles or URLs
  /instagram\.com\/[a-zA-Z0-9_.]+|(?<!\w)@[a-zA-Z0-9_.]{3,}/gi,
  // LinkedIn
  /linkedin\.com\/in\/[a-zA-Z0-9_\-]+/gi,
  // Facebook
  /facebook\.com\/[a-zA-Z0-9_.]+/gi,
  // Explicit words used to circumvent
  /\b(?:meu\s+(?:whats|cel|fone|num|contato|email)|me\s+(?:add|chama|manda)|direto\s+no\s+meu)\b/gi,
]

export function detectContactInfo(text: string): boolean {
  return CONTACT_PATTERNS.some((p) => {
    p.lastIndex = 0
    return p.test(text)
  })
}

export function maskContactInfo(text: string): string {
  let result = text
  for (const pattern of CONTACT_PATTERNS) {
    pattern.lastIndex = 0
    result = result.replace(pattern, '[CONTATO BLOQUEADO]')
  }
  return result
}

/** Fields to check for contact info in each request body */
export const CONTACT_CHECKED_FIELDS: Record<string, string[]> = {
  demands: ['description'],
  proposals: ['description'],
  correspondentRequests: ['description'],
  correspondentProposals: ['description'],
  posts: [], // posts by verified lawyers are allowed to have contact-ish text in bio context — filtered at creation
}
