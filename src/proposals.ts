// Itinéraire proposé sans clé secrète : l'app prépare une demande à coller dans
// l'application Claude, puis lit la réponse collée en retour.
// La réponse est un texte venu de l'extérieur : tout est vérifié, rien n'est exécuté.
import { interests, interestsOn, type Pace, type Preferences } from './interests.ts'
import { activitiesOn, isDate, listDays, type Trip } from './trips.ts'

export const modes = ['plan', 'pick'] as const
// plan : un programme jour par jour. pick : plus d'idées, parmi lesquelles choisir.
export type Mode = (typeof modes)[number]

type RequestLanguage = 'it' | 'en' | 'fr'

const perDay: Record<Mode, Record<Pace, number>> = {
  plan: { calm: 2, normal: 4, intense: 6 },
  pick: { calm: 5, normal: 7, intense: 9 },
}

// Les jours demandés qui ont au moins une envie.
export function requestDays(trip: Trip, preferences: Preferences, date?: string): string[] {
  const days = date ? [date] : listDays(trip.startDate, trip.endDate)
  return days.filter((day) => interestsOn(preferences, day).length > 0)
}

const names = (ids: string[], language: RequestLanguage) =>
  ids
    .map((id) => interests.find((interest) => interest.id === id)?.[language])
    .filter(Boolean)
    .join(', ')

const texts = {
  it: {
    intro: 'Aiutami a organizzare un viaggio.',
    destination: 'Destinazione',
    people: 'Persone',
    pace: 'Ritmo',
    paces: { calm: 'tranquillo', normal: 'normale', intense: 'intenso' },
    days: 'Giorni da organizzare, con i miei interessi',
    existing: 'già in programma, da non ripetere e da non sovrapporre',
    plan: (n: number) =>
      `Prepara un programma realistico: circa ${n} attività per giorno, in ordine di orario, raggruppate per zona per ridurre gli spostamenti, con il tempo per spostarsi e mangiare.`,
    pick: (n: number) =>
      `Dammi circa ${n} idee diverse per ogni giorno, tra cui sceglierò io. L'orario è facoltativo.`,
    rules:
      'Proponi solo luoghi che esistono davvero. Non inventare orari di apertura e non indicare prezzi. Se qualcosa va prenotato o dipende dalla stagione, scrivilo nelle note. Scrivi titoli e note in italiano.',
    format:
      'Rispondi SOLO con un blocco di codice JSON in questa forma, senza altro testo. "time" è HH:MM oppure vuoto. "place" è il nome del luogo, utile per cercarlo su una mappa. "notes" è breve.',
  },
  en: {
    intro: 'Help me plan a trip.',
    destination: 'Destination',
    people: 'People',
    pace: 'Pace',
    paces: { calm: 'relaxed', normal: 'normal', intense: 'busy' },
    days: 'Days to plan, with my interests',
    existing: 'already planned, do not repeat or overlap',
    plan: (n: number) =>
      `Make a realistic plan: about ${n} activities per day, in time order, grouped by area to limit travel, leaving time to get around and eat.`,
    pick: (n: number) =>
      `Give me about ${n} different ideas for each day, so that I can choose. The time is optional.`,
    rules:
      'Only suggest places that really exist. Do not make up opening hours and do not give prices. If something must be booked or depends on the season, say so in the notes. Write titles and notes in English.',
    format:
      'Reply ONLY with a JSON code block in this form, with no other text. "time" is HH:MM or empty. "place" is the name of the place, useful to find it on a map. "notes" is short.',
  },
  fr: {
    intro: 'Aide-moi à organiser un voyage.',
    destination: 'Destination',
    people: 'Personnes',
    pace: 'Rythme',
    paces: { calm: 'tranquille', normal: 'normal', intense: 'intense' },
    days: 'Jours à organiser, avec mes envies',
    existing: 'déjà au programme, à ne pas répéter ni chevaucher',
    plan: (n: number) =>
      `Prépare un programme réaliste : environ ${n} activités par jour, dans l’ordre des heures, regroupées par quartier pour limiter les trajets, avec le temps de se déplacer et de manger.`,
    pick: (n: number) =>
      `Donne-moi environ ${n} idées différentes pour chaque jour, parmi lesquelles je choisirai. L’heure est facultative.`,
    rules:
      'Ne propose que des lieux qui existent vraiment. N’invente pas d’horaires d’ouverture et n’indique aucun prix. Si quelque chose doit être réservé ou dépend de la saison, écris-le dans les notes. Écris les titres et les notes en français.',
    format:
      'Réponds UNIQUEMENT par un bloc de code JSON de cette forme, sans autre texte. « time » est HH:MM ou vide. « place » est le nom du lieu, utile pour le chercher sur une carte. « notes » est court.',
  },
}

// Seuls la destination, les dates, le nombre de personnes, le rythme, les envies et
// le titre avec l'heure des activités déjà prévues quittent l'app.
export function buildRequest(
  trip: Trip,
  preferences: Preferences,
  mode: Mode,
  language: RequestLanguage,
  date?: string,
): string {
  const s = texts[language]
  const days = requestDays(trip, preferences, date)
  const lines = days.map((day) => {
    const planned = activitiesOn(trip, day)
      .map((a) => [a.time, a.title].filter(Boolean).join(' '))
      .join('; ')
    const line = `- ${day}: ${names(interestsOn(preferences, day), language)}`
    return planned ? `${line} (${s.existing}: ${planned})` : line
  })
  const example = {
    activities: [{ date: days[0] ?? trip.startDate, time: '10:00', title: '…', place: '…', notes: '…' }],
  }
  return [
    s.intro,
    `${s.destination}: ${trip.destination}`,
    `${s.people}: ${preferences.people}`,
    `${s.pace}: ${s.paces[preferences.pace]}`,
    '',
    `${s.days}:`,
    ...lines,
    '',
    s[mode](perDay[mode][preferences.pace]),
    s.rules,
    s.format,
    JSON.stringify(example),
  ].join('\n')
}

export type Proposal = {
  date: string
  time: string
  title: string
  place: string
  notes: string
}

export const maxProposals = 600

const clean = (value: unknown, length: number) =>
  typeof value === 'string' ? value.trim().slice(0, length) : ''

// La réponse peut être entourée de texte ou de ```json : on garde l'objet JSON.
// null = illisible ou incomplète. « ignored » compte les entrées inutilisables
// (sans titre, ou pour un jour qui n'a pas été demandé).
export function readProposals(
  answer: string,
  days: string[],
): { proposals: Proposal[]; ignored: number } | null {
  const start = answer.indexOf('{')
  const end = answer.lastIndexOf('}')
  if (start < 0 || end < start) return null
  let value: any
  try {
    value = JSON.parse(answer.slice(start, end + 1))
  } catch {
    return null
  }
  if (!Array.isArray(value?.activities)) return null

  const proposals: Proposal[] = []
  let ignored = 0
  for (const entry of value.activities) {
    const title = clean(entry?.title, 200)
    const date = clean(entry?.date, 10)
    if (!title || !isDate(date) || !days.includes(date) || proposals.length >= maxProposals) {
      ignored++
      continue
    }
    const time = clean(entry.time, 5).padStart(5, '0')
    proposals.push({
      date,
      time: /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : '',
      title,
      place: clean(entry.place, 200),
      notes: clean(entry.notes, 500),
    })
  }
  proposals.sort((a, b) =>
    `${a.date} ${a.time || '99:99'}`.localeCompare(`${b.date} ${b.time || '99:99'}`),
  )
  return { proposals, ignored }
}

export function alreadyPlanned(trip: Trip, proposal: Pick<Proposal, 'date' | 'title'>): boolean {
  const title = proposal.title.toLowerCase()
  return trip.activities.some((a) => a.date === proposal.date && a.title.toLowerCase() === title)
}
