// Lecture d'une réponse collée depuis Claude. C'est un texte venu de l'extérieur :
// tout est vérifié, rien n'est exécuté.

export const clean = (value: unknown, length: number): string =>
  typeof value === 'string' ? value.trim().slice(0, length) : ''

// Seules les adresses web deviennent des liens (jamais « javascript: » et autres).
export function isWebUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 600 || !/^https?:\/\/\S+$/i.test(value)) return false
  try {
    return new URL(value).hostname.includes('.')
  } catch {
    return false
  }
}

// Accepte aussi un lien écrit « [texte](adresse) ».
export function readUrl(value: unknown): string | undefined {
  const found = clean(value, 700).match(/https?:\/\/[^\s)\]<>"]+/i)?.[0]
  return found && isWebUrl(found) ? found : undefined
}

// La réponse peut être entourée de texte ou de ```json : on garde l'objet JSON.
// null = illisible ou incomplète.
export function readJson(answer: string): any {
  const start = answer.indexOf('{')
  const end = answer.lastIndexOf('}')
  if (start < 0 || end < start) return null
  try {
    return JSON.parse(answer.slice(start, end + 1))
  } catch {
    return null
  }
}
