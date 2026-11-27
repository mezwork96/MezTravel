// Itinéraire créé par l'app elle-même, à partir d'un guide inclus : des règles fixes,
// pas une intelligence artificielle. Sans dépendance à l'écran (donc testable).
import { interestsOn, settingsOn, type Pace, type Preferences } from './interests.ts'
import { stageOn, type Stage } from './stages.ts'
import type { Guide, GuideDestination, GuidePlace, Localized } from './guide/types.ts'
import type { Proposal } from './proposals.ts'
import { startTimes } from './questions.ts'
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

const lunchInterests = ['restaurants', 'streetFood', 'markets', 'cafes']
export const lunchText = { it: 'Per pranzo.', en: 'For lunch.', fr: 'Pour le déjeuner.' }

// Ce que les réponses aux questions écartent.
function suits(place: GuidePlace, answers: Record<string, string>): boolean {
  const has = (...ids: string[]) => ids.some((i) => place.interests.includes(i))
  if (answers.evening === 'never' && place.slot === 'evening') return false
  if (answers.walking === 'little' && has('hiking')) return false
  if (answers.hike === 'easy' && has('hiking') && place.hours > 4) return false
  return !(answers.children === 'yes' && has('bars', 'nightlife'))
}

export type DayPlan = {
  proposals: Proposal[]
  unknownCity: string[] // jours dont la ville n'est pas dans le guide
  empty: string[] // jours sans aucun lieu correspondant
  missed: string[] // lieux favoris qui n'ont pas pu être placés
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
  const result: DayPlan = { proposals: [], unknownCity: [], empty: [], missed: [] }
  const favourites = new Set(trip.mustDo ?? [])
  const placed = new Set<string>()
  const top = new Set(preferences.top ?? [])
  const favouritesIn = (id: string, date: string) =>
    guide.places.filter(
      (p) => p.destination === id && favourites.has(p.id) && !used.has(p.id) && isAvailable(p, date),
    ).length
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
    const { pace, answers } = settingsOn(preferences, date)
    const outings = answers.outings !== 'no'
    // Un lieu favori hors des étapes justifie une excursion, dès le deuxième jour.
    const wantedOuting =
      dayNumber >= 2 && !lastDay
        ? guide.destinations.find(
            (d) =>
              d.id !== base.id && !stageIds.has(d.id) && time(base.id, d.id) <= 120 &&
              favouritesIn(d.id, date) > 0,
          )
        : undefined
    const outing =
      wantedOuting ??
      (outings && dayNumber >= 3 && !lastDay
        ? guide.destinations
            .filter(
              (d) =>
                d.minNights === 0 && d.id !== base.id && !stageIds.has(d.id) && !visited.has(d.id) &&
                time(base.id, d.id) <= 75 && matches(d.id) >= 2,
            )
            .sort((a, b) => matches(b.id) - matches(a.id))[0]
        : undefined)
    if (outing) visited.add(outing.id)
    const destination = outing ?? base

    let { hours, count } = limits[pace]
    let start = startTimes[answers.start] ?? startTimes.normal
    // Commencer plus tard raccourcit la journée, plus tôt l'allonge.
    hours += (startTimes.normal - start) / 60
    if (answers.walking === 'little') count = Math.max(1, count - 1)
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
      count = limits[pace].count + 3
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
        // Un lieu favori passe avant les réponses aux questions.
        (favourites.has(p.id) || (p.interests.some((i) => wanted.includes(i)) && suits(p, answers))),
    )
    const score = (p: GuidePlace, areas: Set<string>) =>
      p.interests
        .filter((i) => wanted.includes(i))
        // Une envie déjà servie compte moins, pour varier le programme.
        .reduce((sum, i) => sum + ((top.has(i) ? 20 : 10) / (1 + (seen.get(i) ?? 0))), 0) +
      (areas.has(p.area) ? (answers.walking === 'little' ? 30 : 15) : 0) +
      (p.checked ? 1 : 0) +
      (p.highlight ? (answers.classics === 'first' ? 14 : answers.classics === 'quiet' ? -6 : 3) : 0) +
      (answers.evening === 'often' && p.slot === 'evening' ? 12 : 0) +
      (answers.children === 'yes' && p.interests.includes('kids') ? 8 : 0) +
      (favourites.has(p.id) ? 1000 : 0)

    // Le déjeuner demandé occupe une des places de la journée.
    const lunch =
      mode === 'plan' && answers.lunch === 'yes' && start <= 12 * 60 && hours >= 3
        ? guide.places
            .filter(
              (p) =>
                p.destination === destination.id && !used.has(p.id) && !taken.has(normalise(p.name)) &&
                isAvailable(p, date) && !p.when?.someDays && suits(p, answers) &&
                (p.slot === 'any' || p.slot === 'morning') && p.hours <= 2.5 &&
                p.interests.some((i) => lunchInterests.includes(i)),
            )
        : []

    const chosen: GuidePlace[] = []
    const areas = new Set<string>()
    let spent = 0
    let evenings = 0
    const mainCount = lunch.length ? Math.max(1, count - 1) : count
    while (chosen.length < mainCount) {
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
    // Pas de second repas si le programme en contient déjà un en journée.
    const eats = chosen.some((p) => p.slot !== 'evening' && p.interests.some((i) => lunchInterests.includes(i)))
    let lunchPlace: GuidePlace | undefined
    if (lunch.length && !eats && chosen.length > 0) {
      lunchPlace = lunch
        .filter((p) => !chosen.includes(p))
        .sort(
          (a, b) =>
            Number(areas.has(b.area)) - Number(areas.has(a.area)) ||
            Number(b.checked) - Number(a.checked) ||
            a.id.localeCompare(b.id),
        )[0]
      if (lunchPlace) {
        chosen.push(lunchPlace)
        used.add(lunchPlace.id)
        spent += lunchPlace.hours
      }
    }
    const extras = new Set<string>()
    if (fill && mode === 'plan') {
      const target = Math.min(count, fillTo[pace])
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
              suits(p, answers) &&
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
    // Le déjeuner se place entre les visites du matin et les autres.
    const order = (p: GuidePlace) => (p === lunchPlace ? 0.5 : rank[p.slot])
    chosen.sort((a, b) => order(a) - order(b) || areaOrder.indexOf(a.area) - areaOrder.indexOf(b.area))
    // Le matin ne garde pas plus de visites que ce qui tient avant le déjeuner.
    if (lunchPlace) {
      const others = chosen.filter((p) => p !== lunchPlace)
      let clockTime = start
      let before = 0
      while (before < others.length && others[before].slot !== 'afternoon' && others[before].slot !== 'evening' && clockTime < 11 * 60 + 30) {
        clockTime += Math.round(others[before].hours * 2) * 30 + 30
        before++
      }
      chosen.splice(0, chosen.length, ...others.slice(0, before), lunchPlace, ...others.slice(before))
    }
    let now = start
    for (const place of chosen) {
      if (place === lunchPlace) now = Math.max(now, 12 * 60)
      if (place.slot === 'afternoon') now = Math.max(now, 13 * 60 + 30)
      if (place.slot === 'evening') now = Math.max(now, 18 * 60 + 30)
      // Une visite de journée ne commence pas en fin d'après-midi : on la garde pour un autre jour.
      if (mode === 'plan' && place.slot !== 'evening' && now >= 17 * 60) {
        used.delete(place.id)
        continue
      }
      placed.add(place.id)
      result.proposals.push({
        date,
        time: mode === 'plan' && now < 23 * 60 ? clock(now) : '',
        title: place.name,
        place: `${place.name}, ${destination.name}`,
        notes: [
          extras.has(place.id) && extraText[language],
          place === lunchPlace && lunchText[language],
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
      // La pause de midi n'est ajoutée que si aucun lieu n'est déjà prévu pour manger.
      now = !lunchPlace && now < 12 * 60 + 30 && end >= 12 * 60 + 30 ? end + 60 : end
    }
  }
  const planned = new Set(trip.activities.map((a) => normalise(a.title)))
  result.missed = guide.places
    .filter((p) => favourites.has(p.id) && !placed.has(p.id) && !planned.has(normalise(p.name)))
    .map((p) => p.name)
  return result
}

// Ce que le guide sait d'une étape, selon les envies et les lieux favoris.
export function stageSummary(
  guide: Guide,
  city: string,
  previous: string | undefined,
  preferences: Preferences,
  mustDo: string[] = [],
) {
  const destination = findDestination(guide, city)
  if (!destination) return null
  const wanted = new Set([...preferences.interests, ...preferences.days.flatMap((d) => d.interests)])
  const own = guide.places.filter((p) => p.destination === destination.id)
  const matching = wanted.size ? own.filter((p) => p.interests.some((i) => wanted.has(i))) : own
  const weight = (p: GuidePlace) =>
    (p.highlight ? 10 : 0) + p.interests.filter((i) => wanted.has(i)).length
  const from = previous ? findDestination(guide, previous) : undefined
  const minutes = from && from.id !== destination.id ? travelTimes(guide)(from.id, destination.id) : null
  const direct = guide.travel.find(
    (t) =>
      (t.from === from?.id && t.to === destination.id) ||
      (t.to === from?.id && t.from === destination.id),
  )
  return {
    matching: matching.length,
    examples: [...matching].sort((a, b) => weight(b) - weight(a) || a.id.localeCompare(b.id)).slice(0, 3).map((p) => p.name),
    favourites: own.filter((p) => mustDo.includes(p.id)).map((p) => p.name),
    travel: minutes !== null && minutes < unknownTravel ? minutes : null,
    how: direct?.how ?? '',
  }
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

// Les villes à inclure pour les lieux favoris ; les excursions se font depuis une étape.
export function favouriteCities(guide: Guide, mustDo: string[] = []): string[] {
  const ids = guide.places.filter((p) => mustDo.includes(p.id)).map((p) => p.destination)
  return [...new Set(ids)].filter((id) => guide.destinations.find((d) => d.id === id)!.minNights > 0)
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
    include: [...new Set([...cities, ...favouriteCities(guide, trip.mustDo)])],
    arrival: '',
    departure: '',
  })
  const route = routes.find((r) => r.style === 'balanced') ?? routes[0]
  return route ? toStages(guide, route, language) : null
}
