// Itinéraire créé par l'app elle-même, à partir d'un guide inclus : des règles fixes,
// pas une intelligence artificielle. Sans dépendance à l'écran (donc testable).
import { interestsOn, type Pace, type Preferences } from './interests.ts'
import { stageOn, type Stage } from './stages.ts'
import type { Guide, GuideDestination, GuidePlace, Localized } from './guide/types.ts'
import type { Proposal } from './proposals.ts'
import { activitiesOn, listDays, type Trip } from './trips.ts'

type GuideLanguage = keyof Localized

const unknownTravel = 24 * 60

// Un vol demande aussi les trajets vers les aéroports et l'attente.
const doorToDoor = (minutes: number, how: string) => (/flight/i.test(how) ? minutes + 150 : minutes)

// Plus court trajet entre toutes les paires de destinations, avec les correspondances.
export function travelTimes(guide: Guide): (from: string, to: string) => number {
  const ids = guide.destinations.map((d) => d.id)
  const times = new Map<string, number>()
  const key = (a: string, b: string) => `${a}|${b}`
  const get = (a: string, b: string) => (a === b ? 0 : (times.get(key(a, b)) ?? unknownTravel))
  for (const t of guide.travel) {
    const minutes = Math.min(doorToDoor(t.minutes, t.how), get(t.from, t.to))
    times.set(key(t.from, t.to), minutes)
    times.set(key(t.to, t.from), minutes)
  }
  for (const via of ids) {
    for (const a of ids) {
      for (const b of ids) {
        const through = get(a, via) + get(via, b) + 20
        if (a !== b && through < get(a, b)) times.set(key(a, b), through)
      }
    }
  }
  return get
}

// Combien de lieux de la destination correspondent aux envies.
function appeal(guide: Guide, destination: string, wanted: Set<string>): number {
  return guide.places
    .filter((p) => p.destination === destination)
    .reduce((sum, p) => sum + Math.min(2, p.interests.filter((i) => wanted.has(i)).length), 0)
}

export type RouteChoices = {
  include: string[] // destinations voulues à coup sûr
  arrival: string // identifiant, ou vide
  departure: string
}

export const routeStyles = ['few', 'balanced', 'many'] as const
export type RouteStyle = (typeof routeStyles)[number]

export type PlannedRoute = { style: RouteStyle; ids: string[]; nights: number[]; travelMinutes: number }

// Ordre qui réduit le temps de trajet, avec départ et arrivée imposés s'ils existent.
function bestOrder(ids: string[], time: (a: string, b: string) => number, choices: RouteChoices): string[] {
  const first = ids.includes(choices.arrival) ? choices.arrival : ''
  const last = ids.includes(choices.departure) && choices.departure !== first ? choices.departure : ''
  const middle = ids.filter((id) => id !== first && id !== last)
  const cost = (order: string[]) => {
    const full = [...(first ? [first] : []), ...order, ...(last ? [last] : [])]
    // Retour à la ville de départ (aller et retour par le même aéroport).
    if (choices.departure && choices.departure === choices.arrival) full.push(choices.arrival)
    return full.slice(1).reduce((sum, id, i) => sum + time(full[i], id), 0)
  }
  // Construction au plus proche puis améliorations par échanges : rapide même à 20 villes.
  const remaining = [...middle]
  const order: string[] = []
  let current = first || 'tokyo'
  while (remaining.length) {
    remaining.sort((a, b) => time(current, a) - time(current, b))
    current = remaining.shift()!
    order.push(current)
  }
  let improved = true
  while (improved) {
    improved = false
    for (let i = 0; i < order.length; i++) {
      for (let j = 0; j < order.length; j++) {
        if (i === j) continue
        const moved = [...order]
        moved.splice(j, 0, ...moved.splice(i, 1))
        if (cost(moved) < cost(order)) {
          order.splice(0, order.length, ...moved)
          improved = true
        }
      }
    }
  }
  // Sans arrivée imposée, on préfère commencer par une grande porte d'entrée.
  const full = [...(first ? [first] : []), ...order, ...(last ? [last] : [])]
  if (!first && !last && full.length > 1 && full[full.length - 1] === 'tokyo') full.reverse()
  return full
}

// Répartit exactement « total » nuits, au moins le minimum de chaque ville.
function shareNights(cities: GuideDestination[], weights: number[], total: number): number[] {
  const nights = cities.map((c) => Math.max(1, c.minNights))
  let left = total - nights.reduce((a, b) => a + b, 0)
  while (left < 0) {
    const biggest = nights.indexOf(Math.max(...nights))
    nights[biggest]--
    left++
  }
  while (left > 0) {
    // La ville la plus « en retard » par rapport à son poids reçoit la nuit suivante.
    let best = 0
    for (let i = 1; i < cities.length; i++) {
      if (weights[i] / (nights[i] + 0.5) > weights[best] / (nights[best] + 0.5)) best = i
    }
    nights[best]++
    left--
  }
  return nights
}

export function proposeRoutes(
  guide: Guide,
  totalNights: number,
  preferences: Preferences,
  choices: RouteChoices,
): PlannedRoute[] {
  if (totalNights < 1) return []
  const time = travelTimes(guide)
  const wanted = new Set([...preferences.interests, ...preferences.days.flatMap((d) => d.interests)])
  const byId = new Map(guide.destinations.map((d) => [d.id, d]))
  const forced = [...new Set([choices.arrival, ...choices.include, choices.departure])].filter((id) => byId.has(id))

  const perCity = { calm: 5, normal: 4, intense: 3 }[preferences.pace]
  const base = Math.max(1, Math.round(totalNights / perCity))
  const few = Math.max(totalNights >= 6 ? 2 : 1, base - 1)
  const sizes: Record<RouteStyle, number> = {
    few,
    balanced: Math.max(base, Math.min(few + 1, totalNights)),
    many: Math.max(base + 2, few + 2),
  }

  // Attrait propre : envies satisfaites, plus un bonus aux destinations majeures.
  const value = (d: GuideDestination) => appeal(guide, d.id, wanted) + d.idealNights * 2.5

  const routes: PlannedRoute[] = []
  for (const style of routeStyles) {
    const chosen = [...forced]
    if (chosen.length === 0) {
      chosen.push([...guide.destinations].sort((a, b) => value(b) - value(a))[0].id)
    }
    while (chosen.length < Math.min(sizes[style], totalNights)) {
      const used = chosen.reduce((sum, id) => sum + Math.max(1, byId.get(id)!.minNights), 0)
      let best: { id: string; score: number } | undefined
      for (const d of guide.destinations) {
        // minNights 0 : destination à visiter en excursion, pas une étape (sauf demande).
        if (d.minNights === 0 || chosen.includes(d.id) || used + d.minNights > totalNights) continue
        const near = Math.min(...chosen.map((id) => time(id, d.id)))
        // Les destinations lointaines ne sont ajoutées que si elles apportent beaucoup.
        const score = value(d) / (1 + Math.max(0, near - 45) / 90)
        if (!best || score > best.score) best = { id: d.id, score }
      }
      if (!best) break
      chosen.push(best.id)
    }
    const ids = bestOrder(chosen, time, choices).slice(0, totalNights)
    const cities = ids.map((id) => byId.get(id)!)
    const weights = cities.map((c) => Math.max(0.5, c.idealNights) * (1 + appeal(guide, c.id, wanted) / 20))
    const nights = shareNights(cities, weights, totalNights)
    const travelMinutes = ids.slice(1).reduce((sum, id, i) => sum + time(ids[i], id), 0)
    if (!routes.some((r) => r.ids.join() === ids.join())) routes.push({ style, ids, nights, travelMinutes })
  }
  return routes
}

export function toStages(guide: Guide, route: PlannedRoute, language: GuideLanguage): Stage[] {
  return route.ids.map((id, index) => {
    const d = guide.destinations.find((c) => c.id === id)!
    const previous = route.ids[index - 1]
    const direct = guide.travel.find(
      (t) => (t.from === previous && t.to === id) || (t.to === previous && t.from === id),
    )
    return {
      city: d.name,
      nights: route.nights[index],
      why: d.about[language],
      source: d.source,
      ...(previous
        ? {
            transfer: direct
              ? `${direct.how} (~${direct.minutes} min)`
              : `~${travelTimes(guide)(previous, id)} min`,
          }
        : {}),
    }
  })
}

// « Kyoto », « kyōto » ou « Kyoto (Gion) » désignent la même destination.
const normalise = (text: string) =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

// Autres façons courantes d'écrire une ville.
const spellings: Record<string, string> = { tokio: 'tokyo', kioto: 'kyoto', chioto: 'kyoto' }
const spelled = (text: string) =>
  normalise(text).replace(/[a-z]+/g, (word) => spellings[word] ?? word)

const japan = /gia?pp?one|jap+on|japan|nippon|日本/i
export const isJapan = (text: string) => japan.test(normalise(text))

export function findDestination(guide: Guide, city: string): GuideDestination | undefined {
  const wanted = spelled(city)
  if (!wanted) return undefined
  const direct = guide.destinations.find((d) => {
    const name = normalise(d.name)
    return wanted === d.id || wanted === name || wanted.split(/[^a-z]+/).includes(d.id)
  })
  if (direct) return direct
  // Un nom de préfecture suffit quand elle n'a qu'une destination dans le guide.
  const inside = guide.destinations.filter((d) => d.prefectures.some((p) => normalise(p) === wanted))
  return inside.length === 1 ? inside[0] : undefined
}

const limits: Record<Pace, { hours: number; count: number }> = {
  calm: { hours: 5, count: 2 },
  normal: { hours: 7.5, count: 4 },
  intense: { hours: 10, count: 6 },
}

// Lieux généraux, pour compléter une journée quand on le demande.
const generalInterests = [
  'museums', 'modernArt', 'historic', 'temples', 'architecture', 'neighborhoods',
  'viewpoints', 'nature', 'markets',
]
const fillTo: Record<Pace, number> = { calm: 2, normal: 3, intense: 4 }
export const extraText = {
  it: 'Extra, fuori dagli interessi scelti.',
  en: 'Extra, outside your chosen interests.',
  fr: 'En plus, hors des envies choisies.',
}

const outingText = { it: 'Gita da', en: 'Day trip from', fr: 'Excursion depuis' }

const clock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

export type DayPlan = {
  proposals: Proposal[]
  unknownCity: string[] // jours dont la ville n'est pas dans le guide
  empty: string[] // jours sans aucun lieu correspondant
}

// Le lieu peut-il être proposé ce jour-là, d'après les périodes connues ?
export function isAvailable(place: GuidePlace, date: string): boolean {
  const when = place.when
  if (!when) return true
  const day = date.slice(5)
  if (when.months && !when.months.includes(Number(date.slice(5, 7)))) return false
  if (when.from && when.to && (day < when.from || day > when.to)) return false
  if (when.closedWeekdays?.includes(new Date(`${date}T00:00:00Z`).getUTCDay())) return false
  return !when.closed?.some(([from, to]) => date >= from && date <= to)
}

// mode « pick » : plus d'idées par jour, sans horaire, pour choisir soi-même.
export function planDays(
  guide: Guide,
  trip: Trip,
  preferences: Preferences,
  days: string[],
  mode: 'plan' | 'pick',
  language: GuideLanguage,
  fill = false,
): DayPlan {
  const allDays = listDays(trip.startDate, trip.endDate)
  const time = travelTimes(guide)
  const used = new Set<string>()
  // Une activité hors des dates du voyage (après un report) ne bloque rien.
  const taken = new Set(
    trip.activities.filter((a) => allDays.includes(a.date)).map((a) => normalise(a.title)),
  )
  const seen = new Map<string, number>() // fois où une envie a déjà été servie
  const result: DayPlan = { proposals: [], unknownCity: [], empty: [] }
  const onlyDestination = findDestination(guide, trip.destination)
  const stageIds = new Set((trip.stages ?? []).map((s) => findDestination(guide, s.city)?.id))
  const visited = new Set<string>() // excursions déjà placées
  const daysIn = new Map<string, number>() // jours déjà organisés dans chaque ville

  for (const date of days) {
    const wanted = interestsOn(preferences, date)
    if (wanted.length === 0) continue
    const here = stageOn(allDays, trip.stages ?? [], date)
    const base = here ? findDestination(guide, here.stage.city) : onlyDestination
    if (!base) {
      result.unknownCity.push(date)
      continue
    }

    // À partir du troisième jour complet au même endroit : une excursion proche.
    const lastDay = date === allDays[allDays.length - 1] && allDays.length > 1
    const dayNumber = here?.from ? 0 : (daysIn.get(base.id) ?? 0) + 1
    daysIn.set(base.id, Math.max(dayNumber, daysIn.get(base.id) ?? 0))
    const matches = (id: string) =>
      guide.places.filter((p) => p.destination === id && p.interests.some((i) => wanted.includes(i))).length
    const outing =
      dayNumber >= 3 && !lastDay
        ? guide.destinations
            .filter(
              (d) =>
                d.minNights === 0 && d.id !== base.id && !stageIds.has(d.id) && !visited.has(d.id) &&
                time(base.id, d.id) <= 75 && matches(d.id) >= 2,
            )
            .sort((a, b) => matches(b.id) - matches(a.id))[0]
        : undefined
    if (outing) visited.add(outing.id)
    const destination = outing ?? base

    let { hours, count } = limits[preferences.pace]
    let start = 9 * 60 + 30
    const from = here?.from ? findDestination(guide, here.from) : undefined
    if (here?.from) {
      // Jour de déplacement : le trajet et les bagages prennent une partie de la journée.
      const travel = from ? time(from.id, destination.id) : 180
      const lost = travel / 60 + 1.5
      hours = Math.max(0, hours - lost)
      start = Math.max(start, 9 * 60 + Math.ceil((lost * 60) / 30) * 30)
      count = Math.max(1, Math.min(count, Math.floor(hours / 2)))
    }
    if (outing) {
      const oneWay = time(base.id, outing.id)
      hours -= (oneWay * 2) / 60
      start += Math.ceil(oneWay / 30) * 30
    }
    if (lastDay) {
      hours = Math.min(hours, 4)
      count = Math.min(count, 2)
    }
    // Les activités déjà prévues occupent de la place dans la journée.
    const planned = activitiesOn(trip, date).length
    count = Math.max(0, count - planned)
    if (mode === 'pick') {
      count = limits[preferences.pace].count + 3
      hours = 99
    }
    if (count === 0) continue

    const free = guide.places.filter(
      (p) =>
        p.destination === destination.id &&
        !used.has(p.id) &&
        !taken.has(normalise(p.name)) &&
        isAvailable(p, date) &&
        // Un événement « certains jours » n'est proposé que quand on choisit soi-même.
        (mode === 'pick' || !p.when?.someDays) &&
        p.interests.some((i) => wanted.includes(i)),
    )
    const score = (p: GuidePlace, areas: Set<string>) =>
      p.interests
        .filter((i) => wanted.includes(i))
        // Une envie déjà servie compte moins, pour varier le programme.
        .reduce((sum, i) => sum + 10 / (1 + (seen.get(i) ?? 0)), 0) +
      (areas.has(p.area) ? 15 : 0) +
      (p.checked ? 1 : 0)

    const chosen: GuidePlace[] = []
    const areas = new Set<string>()
    let spent = 0
    let evenings = 0
    while (chosen.length < count) {
      const candidates = free
        .filter((p) => !chosen.includes(p))
        .filter((p) => mode === 'pick' || p.slot !== 'evening' || (evenings === 0 && !lastDay))
        // Un seul lieu très long peut dépasser la durée d'une journée vide.
        .filter((p) => chosen.length === 0 || spent + p.hours <= hours)
        .filter((p) => mode === 'pick' || chosen.length > 0 || p.hours <= Math.max(hours, 0) + 2)
        .sort((a, b) => score(b, areas) - score(a, areas) || a.id.localeCompare(b.id))
      const next = candidates[0]
      if (!next) break
      chosen.push(next)
      used.add(next.id)
      areas.add(next.area)
      spent += next.hours
      if (next.slot === 'evening') evenings++
      for (const i of next.interests) seen.set(i, (seen.get(i) ?? 0) + 1)
    }
    const extras = new Set<string>()
    if (fill && mode === 'plan') {
      const target = Math.min(count, fillTo[preferences.pace])
      while (chosen.length < target) {
        const next = guide.places
          .filter(
            (p) =>
              p.destination === destination.id &&
              !used.has(p.id) &&
              !taken.has(normalise(p.name)) &&
              isAvailable(p, date) &&
              !p.when?.someDays &&
              p.slot !== 'evening' &&
              p.interests.every((i) => !['hiking', 'activeSports', 'winterSports', 'waterSports', 'bars', 'nightlife'].includes(i)) &&
              p.interests.some((i) => generalInterests.includes(i)) &&
              spent + p.hours <= hours,
          )
          .sort(
            (a, b) =>
              Number(areas.has(b.area)) - Number(areas.has(a.area)) ||
              Number(b.checked) - Number(a.checked) ||
              a.id.localeCompare(b.id),
          )[0]
        if (!next) break
        chosen.push(next)
        extras.add(next.id)
        used.add(next.id)
        areas.add(next.area)
        spent += next.hours
      }
    }
    if (chosen.length === 0) {
      result.empty.push(date)
      continue
    }

    const rank = { morning: 0, any: 1, afternoon: 2, evening: 3 }
    // Par moment de la journée, en gardant ensemble les lieux d'un même quartier.
    const areaOrder = [...areas]
    chosen.sort((a, b) => rank[a.slot] - rank[b.slot] || areaOrder.indexOf(a.area) - areaOrder.indexOf(b.area))
    let now = start
    for (const place of chosen) {
      if (place.slot === 'afternoon') now = Math.max(now, 13 * 60 + 30)
      if (place.slot === 'evening') now = Math.max(now, 18 * 60 + 30)
      // Une visite de journée ne commence pas en fin d'après-midi : on la garde pour un autre jour.
      if (mode === 'plan' && place.slot !== 'evening' && now >= 17 * 60) {
        used.delete(place.id)
        continue
      }
      result.proposals.push({
        date,
        time: mode === 'plan' && now < 23 * 60 ? clock(now) : '',
        title: place.name,
        place: `${place.name}, ${destination.name}`,
        notes: [
          extras.has(place.id) && extraText[language],
          outing && `${outingText[language]} ${base.name} (~${time(base.id, outing.id)} min).`,
          place.about[language],
          place.note[language],
        ]
          .filter(Boolean)
          .join(' '),
        source: place.source,
      })
      // Visite, trajet, et la pause de midi.
      const end = now + Math.round(place.hours * 2) * 30 + 30
      now = now < 12 * 60 + 30 && end >= 12 * 60 + 30 ? end + 60 : end
    }
  }
  return result
}

// Les villes du guide citées dans un texte, comme « Tokyo e Kyoto ».
export function mentionedCities(guide: Guide, text: string): string[] {
  const words = ` ${spelled(text).split(/[^a-z]+/).join(' ')} `
  return guide.destinations.filter((d) => words.includes(` ${d.id} `)).map((d) => d.id)
}

// Le guide s'applique si la destination du voyage est le Japon ou une de ses villes.
export function guideCovers(guide: Guide, trip: Pick<Trip, 'destination' | 'stages'>): boolean {
  if (isJapan(trip.destination)) return true
  if (findDestination(guide, trip.destination) || mentionedCities(guide, trip.destination).length) return true
  return Boolean(trip.stages?.length && trip.stages.every((s) => findDestination(guide, s.city)))
}

// Sans parcours enregistré, l'app en choisit un elle-même pour pouvoir créer
// l'itinéraire en une fois. null : inutile (parcours déjà là ou une seule ville).
export function automaticRoute(
  guide: Guide,
  trip: Trip,
  preferences: Preferences,
  language: GuideLanguage,
): Stage[] | null {
  if (trip.stages?.length) return null
  const cities = mentionedCities(guide, trip.destination)
  if (cities.length === 1 || (!cities.length && findDestination(guide, trip.destination))) return null
  const nights = listDays(trip.startDate, trip.endDate).length - 1
  const routes = proposeRoutes(guide, Math.max(1, nights), preferences, {
    include: cities,
    arrival: '',
    departure: '',
  })
  const route = routes.find((r) => r.style === 'balanced') ?? routes[0]
  return route ? toStages(guide, route, language) : null
}
