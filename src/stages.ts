// Parcours en plusieurs étapes : les villes dans l'ordre et le nombre de nuits de
// chacune. Sans dépendance à l'écran (donc testable).
import { clean, isWebUrl, readJson, readUrl } from './answer.ts'
import { consultantRules, ideaLabel } from './consultant.ts'
import { interests, paces, type Preferences } from './interests.ts'

export type Stage = {
  city: string
  nights: number
  area?: string // quartier où l'on dort, facultatif
  why?: string
  transfer?: string // comment arriver depuis l'étape précédente
  source?: string
}

export type RouteWishes = {
  arrival: string
  departure: string
  mustSee: string
  idea?: string // parcours que l'on a déjà en tête
}
export const emptyWishes: RouteWishes = { arrival: '', departure: '', mustSee: '' }

export const maxStages = 60
export const maxNights = 365

export const totalNights = (stages: Stage[]) => stages.reduce((sum, s) => sum + s.nights, 0)

// Les jours de chaque étape. Le jour d'un déplacement appartient à la ville où l'on
// dort le soir ; le dernier jour du voyage appartient à la dernière étape.
// « days » : tous les jours du voyage, dans l'ordre.
export function stageDays(days: string[], stages: Stage[]): { stage: Stage; days: string[] }[] {
  let night = 0
  return stages.map((stage, index) => {
    const from = night
    night += stage.nights
    const own = days.slice(from, night)
    const last = days[days.length - 1]
    if (index === stages.length - 1 && night === days.length - 1 && last) own.push(last)
    return { stage, days: own }
  })
}

// « from » : la ville quittée ce jour-là, seulement le jour du déplacement.
export function stageOn(
  days: string[],
  stages: Stage[],
  date: string,
): { stage: Stage; from?: string } | undefined {
  const all = stageDays(days, stages)
  const index = all.findIndex((entry) => entry.days.includes(date))
  if (index < 0) return undefined
  const from = index > 0 && all[index].days[0] === date ? all[index - 1].stage.city : undefined
  return from ? { stage: all[index].stage, from } : { stage: all[index].stage }
}

export function isStage(value: any): boolean {
  return (
    typeof value?.city === 'string' &&
    value.city !== '' &&
    Number.isInteger(value.nights) &&
    value.nights >= 1 &&
    value.nights <= maxNights &&
    ['area', 'why', 'transfer'].every((k) => value[k] === undefined || typeof value[k] === 'string') &&
    (value.source === undefined || isWebUrl(value.source))
  )
}

export function isRouteWishes(value: any): boolean {
  return (
    ['arrival', 'departure', 'mustSee'].every((k) => typeof value?.[k] === 'string') &&
    (value.idea === undefined || typeof value.idea === 'string')
  )
}

type RequestLanguage = 'it' | 'en' | 'fr'

const texts = {
  it: {
    intro: 'Aiutami a decidere il percorso di un viaggio.',
    destination: 'Destinazione',
    dates: 'Date',
    nights: 'Notti da distribuire',
    people: 'Persone',
    pace: 'Ritmo',
    paces: { calm: 'tranquillo', normal: 'normale', intense: 'intenso' },
    interests: 'Cosa mi interessa',
    arrival: 'Città di arrivo',
    departure: 'Città di partenza per il ritorno',
    mustSee: 'Voglio assolutamente includere',
    task: (n: number) =>
      `Cerca il percorso più adatto a me: le città in ordine e quante notti in ognuna. La somma delle notti deve essere esattamente ${n}. Ordina le tappe per evitare di tornare indietro, non fare troppi cambi per il ritmo scelto e considera il tempo degli spostamenti.`,
    rules:
      'Cerca sul web informazioni aggiornate, dando la precedenza a siti ufficiali (enti del turismo, trasporti, luoghi da visitare). In "source" metti l’indirizzo esatto di una pagina che hai davvero consultato, altrimenti lascialo vuoto: non inventare link. Non indicare prezzi. Se non puoi cercare sul web, metti "webSearch": false. Scrivi in italiano.',
    format:
      'Il risultato finale è un blocco di codice JSON in questa forma, con il percorso che abbiamo scelto. "nights" è un numero intero di almeno 1. "why" spiega in breve perché quella tappa, "transfer" come arrivarci dalla tappa precedente e quanto dura circa.',
  },
  en: {
    intro: 'Help me decide the route of a trip.',
    destination: 'Destination',
    dates: 'Dates',
    nights: 'Nights to share out',
    people: 'People',
    pace: 'Pace',
    paces: { calm: 'relaxed', normal: 'normal', intense: 'busy' },
    interests: 'What interests me',
    arrival: 'Arrival city',
    departure: 'City I leave from to go home',
    mustSee: 'I definitely want to include',
    task: (n: number) =>
      `Look for the route that suits me best: the cities in order and how many nights in each. The nights must add up to exactly ${n}. Order the stops to avoid backtracking, do not change place too often for the chosen pace, and allow for travel time.`,
    rules:
      'Search the web for up-to-date information, giving priority to official websites (tourist boards, transport, places to visit). In "source" put the exact address of a page you really consulted, otherwise leave it empty: do not make up links. Do not give prices. If you cannot search the web, set "webSearch": false. Write in English.',
    format:
      'The final result is a JSON code block in this form, with the route we chose. "nights" is a whole number, at least 1. "why" briefly explains the stop, "transfer" how to get there from the previous stop and roughly how long it takes.',
  },
  fr: {
    intro: 'Aide-moi à choisir le parcours d’un voyage.',
    destination: 'Destination',
    dates: 'Dates',
    nights: 'Nuits à répartir',
    people: 'Personnes',
    pace: 'Rythme',
    paces: { calm: 'tranquille', normal: 'normal', intense: 'intense' },
    interests: 'Ce qui m’intéresse',
    arrival: 'Ville d’arrivée',
    departure: 'Ville de départ pour le retour',
    mustSee: 'Je veux absolument inclure',
    task: (n: number) =>
      `Cherche le parcours qui me convient le mieux : les villes dans l’ordre et le nombre de nuits dans chacune. Le total doit faire exactement ${n}. Ordonne les étapes pour éviter les retours en arrière, ne change pas trop souvent de ville vu le rythme choisi et tiens compte des trajets.`,
    rules:
      'Cherche sur le web des informations à jour, en privilégiant les sites officiels (offices de tourisme, transports, lieux à visiter). Dans « source », mets l’adresse exacte d’une page réellement consultée, sinon laisse vide : n’invente aucun lien. N’indique aucun prix. Si tu ne peux pas chercher sur le web, mets « webSearch » : false. Écris en français.',
    format:
      'Le résultat final est un bloc de code JSON de cette forme, avec le parcours choisi. « nights » est un entier d’au moins 1. « why » explique brièvement l’étape, « transfer » comment y arriver depuis l’étape précédente et en combien de temps environ.',
  },
}

type RequestTrip = { destination: string; startDate: string; endDate: string }

export function buildRouteRequest(
  trip: RequestTrip,
  nights: number,
  preferences: Preferences,
  wishes: RouteWishes,
  language: RequestLanguage,
): string {
  const s = texts[language]
  // Les envies du voyage et celles ajoutées pour certains jours.
  const wanted = new Set([...preferences.interests, ...preferences.days.flatMap((d) => d.interests)])
  const names = interests.filter((i) => wanted.has(i.id)).map((i) => i[language])
  const optional = (label: string, value: string) => (value.trim() ? [`${label}: ${value.trim()}`] : [])
  const example = {
    webSearch: true,
    routes: [
      { name: '…', summary: '…', stages: [{ city: '…', nights: 1, why: '…', transfer: '…', source: '…' }] },
    ],
  }
  return [
    s.intro,
    `${s.destination}: ${trip.destination}`,
    `${s.dates}: ${trip.startDate} → ${trip.endDate}`,
    `${s.nights}: ${nights}`,
    `${s.people}: ${preferences.people}`,
    `${s.pace}: ${s.paces[paces.includes(preferences.pace) ? preferences.pace : 'normal']}`,
    ...optional(s.interests, names.join(', ')),
    ...optional(s.arrival, wishes.arrival),
    ...optional(s.departure, wishes.departure),
    ...optional(s.mustSee, wishes.mustSee),
    ...optional(ideaLabel(language), wishes.idea ?? ''),
    '',
    ...consultantRules(language, 'route', Boolean(wishes.idea?.trim())),
    '',
    s.task(nights),
    s.rules,
    s.format,
    JSON.stringify(example),
  ].join('\n')
}

export type ProposedRoute = { name: string; summary: string; stages: Stage[] }

export function readRoutes(answer: string): { routes: ProposedRoute[]; searched: boolean } | null {
  const value = readJson(answer)
  if (!Array.isArray(value?.routes)) return null
  const routes: ProposedRoute[] = []
  for (const entry of value.routes.slice(0, 6)) {
    if (!Array.isArray(entry?.stages) || entry.stages.length > maxStages) continue
    const stages: Stage[] = []
    for (const raw of entry.stages) {
      const stage: Stage = { city: clean(raw?.city, 100), nights: Number(raw?.nights) }
      for (const key of ['why', 'transfer'] as const) {
        const text = clean(raw?.[key], 500)
        if (text) stage[key] = text
      }
      const source = readUrl(raw?.source)
      if (source) stage.source = source
      stages.push(stage)
    }
    // Une étape inutilisable fausserait le parcours : on écarte alors tout le parcours.
    if (stages.length === 0 || !stages.every(isStage)) continue
    routes.push({ name: clean(entry.name, 150), summary: clean(entry.summary, 600), stages })
  }
  return routes.length ? { routes, searched: value.webSearch !== false } : null
}
