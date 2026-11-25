// Itinéraire proposé sans clé secrète : l'app prépare une demande à coller dans
// l'application Claude, puis lit la réponse collée en retour.
// La réponse est un texte venu de l'extérieur : tout est vérifié, rien n'est exécuté.
import { clean, readJson, readUrl } from './answer.ts'
import { consultantRules } from './consultant.ts'
import { interests, interestsOn, type Pace, type Preferences } from './interests.ts'
import { stageOn } from './stages.ts'
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
    in: 'a',
    from: 'arrivo quel giorno da',
    sleep: 'dormo in zona',
    plan: (n: number) =>
      `Prepara un programma realistico: circa ${n} attività per giorno, in ordine di orario, raggruppate per zona per ridurre gli spostamenti, con il tempo per spostarsi e mangiare.`,
    pick: (n: number) =>
      `Dammi circa ${n} idee diverse per ogni giorno, tra cui sceglierò io. L'orario è facoltativo.`,
    rules:
      'Cerca sul web informazioni aggiornate, dando la precedenza ai siti ufficiali (musei, templi, onsen, parchi, enti del turismo). Proponi solo luoghi che esistono davvero. In ogni giorno scegli luoghi vicini tra loro e, se indicata, comodi dalla zona in cui dormo. Controlla chiusure ed eventi per quelle date; se non sono ancora pubblicati, scrivilo nelle note. In "source" metti l’indirizzo esatto di una pagina che hai davvero consultato per quel luogo, altrimenti lascialo vuoto: non inventare link. Non inventare orari di apertura e non indicare prezzi. Se qualcosa va prenotato o dipende dalla stagione, scrivilo nelle note. Se non puoi cercare sul web, metti "webSearch": false. Scrivi titoli e note in italiano.',
    format:
      'Il risultato finale è un blocco di codice JSON in questa forma, con quello che abbiamo scelto. "time" è HH:MM oppure vuoto. "place" è il nome del luogo, utile per cercarlo su una mappa. "notes" è breve.',
  },
  en: {
    intro: 'Help me plan a trip.',
    destination: 'Destination',
    people: 'People',
    pace: 'Pace',
    paces: { calm: 'relaxed', normal: 'normal', intense: 'busy' },
    days: 'Days to plan, with my interests',
    existing: 'already planned, do not repeat or overlap',
    in: 'in',
    from: 'arriving that day from',
    sleep: 'I sleep in the area of',
    plan: (n: number) =>
      `Make a realistic plan: about ${n} activities per day, in time order, grouped by area to limit travel, leaving time to get around and eat.`,
    pick: (n: number) =>
      `Give me about ${n} different ideas for each day, so that I can choose. The time is optional.`,
    rules:
      'Search the web for up-to-date information, giving priority to official websites (museums, temples, onsen, parks, tourist boards). Only suggest places that really exist. On each day choose places close to each other and, if given, handy from the area where I sleep. Check closures and events for those dates; if they are not published yet, say so in the notes. In "source" put the exact address of a page you really consulted about that place, otherwise leave it empty: do not make up links. Do not make up opening hours and do not give prices. If something must be booked or depends on the season, say so in the notes. If you cannot search the web, set "webSearch": false. Write titles and notes in English.',
    format:
      'The final result is a JSON code block in this form, with what we chose. "time" is HH:MM or empty. "place" is the name of the place, useful to find it on a map. "notes" is short.',
  },
  fr: {
    intro: 'Aide-moi à organiser un voyage.',
    destination: 'Destination',
    people: 'Personnes',
    pace: 'Rythme',
    paces: { calm: 'tranquille', normal: 'normal', intense: 'intense' },
    days: 'Jours à organiser, avec mes envies',
    existing: 'déjà au programme, à ne pas répéter ni chevaucher',
    in: 'à',
    from: 'arrivée ce jour-là depuis',
    sleep: 'je dors dans le quartier',
    plan: (n: number) =>
      `Prépare un programme réaliste : environ ${n} activités par jour, dans l’ordre des heures, regroupées par quartier pour limiter les trajets, avec le temps de se déplacer et de manger.`,
    pick: (n: number) =>
      `Donne-moi environ ${n} idées différentes pour chaque jour, parmi lesquelles je choisirai. L’heure est facultative.`,
    rules:
      'Cherche sur le web des informations à jour, en privilégiant les sites officiels (musées, temples, onsen, parcs, offices de tourisme). Ne propose que des lieux qui existent vraiment. Chaque jour, choisis des lieux proches les uns des autres et, s’il est indiqué, pratiques depuis le quartier où je dors. Vérifie les fermetures et événements à ces dates ; s’ils ne sont pas encore publiés, écris-le dans les notes. Dans « source », mets l’adresse exacte d’une page réellement consultée sur ce lieu, sinon laisse vide : n’invente aucun lien. N’invente pas d’horaires d’ouverture et n’indique aucun prix. Si quelque chose doit être réservé ou dépend de la saison, écris-le dans les notes. Si tu ne peux pas chercher sur le web, mets « webSearch » : false. Écris les titres et les notes en français.',
    format:
      'Le résultat final est un bloc de code JSON de cette forme, avec ce que nous avons choisi. « time » est HH:MM ou vide. « place » est le nom du lieu, utile pour le chercher sur une carte. « notes » est court.',
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
  only?: string[], // les jours d'une étape
): string {
  const s = texts[language]
  const days = requestDays(trip, preferences, date).filter((day) => !only || only.includes(day))
  const allDays = listDays(trip.startDate, trip.endDate)
  const where = (day: string) => {
    const found = stageOn(allDays, trip.stages ?? [], day)
    if (!found) return ''
    const details = [
      found.from && `${s.from} ${found.from}`,
      found.stage.area && `${s.sleep} ${found.stage.area}`,
    ].filter(Boolean)
    return ` ${s.in} ${found.stage.city}${details.length ? ` (${details.join(', ')})` : ''}`
  }
  const lines = days.map((day) => {
    const planned = activitiesOn(trip, day)
      .map((a) => [a.time, a.title].filter(Boolean).join(' '))
      .join('; ')
    const line = `- ${day}${where(day)}: ${names(interestsOn(preferences, day), language)}`
    return planned ? `${line} (${s.existing}: ${planned})` : line
  })
  const example = {
    webSearch: true,
    activities: [
      { date: days[0] ?? trip.startDate, time: '10:00', title: '…', place: '…', notes: '…', source: '…' },
    ],
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
    ...consultantRules(language, 'days'),
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
  source?: string
}

export const maxProposals = 600

// null = illisible ou incomplète. « ignored » compte les entrées inutilisables
// (sans titre, ou pour un jour qui n'a pas été demandé).
export function readProposals(
  answer: string,
  days: string[],
): { proposals: Proposal[]; ignored: number; searched: boolean } | null {
  const value = readJson(answer)
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
    const source = readUrl(entry.source)
    proposals.push({
      ...(source ? { source } : {}),
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
  return { proposals, ignored, searched: value.webSearch !== false }
}

export function alreadyPlanned(trip: Trip, proposal: Pick<Proposal, 'date' | 'title'>): boolean {
  const title = proposal.title.toLowerCase()
  return trip.activities.some((a) => a.date === proposal.date && a.title.toLowerCase() === title)
}
