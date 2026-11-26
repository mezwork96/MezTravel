// Traduction de texte avec MyMemory.
// Spécification : https://mymemory.translated.net/doc/spec.php
// Conditions : https://mymemory.translated.net/terms-and-conditions
// - seulement à la demande, un paragraphe à la fois, 500 octets au maximum ;
// - le service conserve les textes envoyés : l'écran le dit clairement ;
// - aucune adresse e-mail envoyée (limite gratuite anonyme : 5000 caractères par jour) ;
// - aucun contournement de la limite.
import { readCache, writeCache } from './cache.ts'
import { knownPhrase } from './phrases.ts'

export const maxBytes = 500
const historyKey = 'meztravel.translations'
const keptTranslations = 30

export const translationLanguages = [
  'it', 'en', 'fr', 'ja', 'de', 'es', 'pt', 'zh-CN', 'zh-TW', 'ko', 'th', 'vi', 'id', 'ms', 'hi',
  'ar', 'he', 'tr', 'el', 'ru', 'uk', 'pl', 'cs', 'sk', 'hu', 'ro', 'bg', 'hr', 'sl', 'sr', 'nl',
  'da', 'sv', 'no', 'fi', 'is', 'et', 'lv', 'lt', 'fa', 'sw',
]

export type Translation = { from: string; to: string; text: string; result: string }

export type TextProblem = 'empty' | 'tooLong' | 'paragraphs' | null

// La limite est en octets : un caractère japonais en vaut trois.
export const byteLength = (text: string) => new TextEncoder().encode(text).length

export function checkText(text: string): TextProblem {
  const clean = text.trim()
  if (!clean) return 'empty'
  if (/\n\s*\n/.test(clean)) return 'paragraphs'
  return byteLength(clean) > maxBytes ? 'tooLong' : null
}

const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

// Certaines réponses contiennent des codes comme &#39; à la place des caractères.
export function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] !== '#') return entities[code.toLowerCase()] ?? whole
    const hex = code[1].toLowerCase() === 'x'
    const number = Number.parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10)
    return number <= 0x10ffff ? String.fromCodePoint(number) : whole
  })
}

export class QuotaError extends Error {}

// En cas d'erreur, le service met le message d'erreur à la place de la traduction
// (avec un code HTTP 200) : seul « responseStatus » permet de le reconnaître.
export function readAnswer(value: any): string {
  const text = value?.responseData?.translatedText
  const quota =
    value?.quotaFinished === true ||
    Number(value?.responseStatus) === 429 ||
    /MYMEMORY WARNING/i.test(String(text ?? ''))
  if (quota) throw new QuotaError('quota')
  if (Number(value?.responseStatus) !== 200 || typeof text !== 'string' || !text.trim()) {
    throw new Error('translation failed')
  }
  return decodeEntities(text)
}

export const history = () => readCache<Translation[]>(historyKey) ?? []
export const clearHistory = () => writeCache(historyKey, [])

export async function translate(text: string, from: string, to: string): Promise<string> {
  const clean = text.trim()
  // Phrase de voyage incluse : réponse sûre, sans envoi ni quota.
  const ready = knownPhrase(clean, from, to)
  if (ready) return ready
  const past = history()
  // Une phrase déjà traduite est relue sur le téléphone, même sans internet.
  const known = past.find((t) => t.text === clean && t.from === from && t.to === to)
  if (known) {
    writeCache(historyKey, [known, ...past.filter((t) => t !== known)])
    return known.result
  }
  const params = new URLSearchParams({ q: clean, langpair: `${from}|${to}` })
  const response = await fetch(`https://api.mymemory.translated.net/get?${params}`, {
    signal: AbortSignal.timeout(15_000),
  })
  if (response.status === 429) throw new QuotaError('quota')
  if (!response.ok) throw new Error(`MyMemory ${response.status}`)
  const result = readAnswer(await response.json())
  writeCache(historyKey, [{ from, to, text: clean, result }, ...past].slice(0, keptTranslations))
  return result
}
