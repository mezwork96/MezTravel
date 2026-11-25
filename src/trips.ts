// Données des voyages et règles de calcul, sans dépendance à l'écran (donc testables).
// Chaque élément a un identifiant unique et chaque voyage une date de modification :
// cela servira pour le partage entre téléphones.
import { isPreferences, type Preferences } from './interests.ts'

export type Activity = {
  id: string
  date: string // AAAA-MM-JJ
  time: string // HH:MM, ou vide si l'heure n'est pas fixée
  title: string
  place: string
  notes: string
  // Point sur la carte, absent des données et copies créées avant la phase 2.
  location?: Location
}

export type Location = {
  lat: number
  lon: number
  label: string // adresse renvoyée par la recherche
}

export type Item = {
  id: string
  date: string
  text: string
  done: boolean
}

export const bookingTypes = ['stay', 'flight', 'transport', 'ticket', 'other'] as const
export type BookingType = (typeof bookingTypes)[number]

export type Booking = {
  id: string
  type: BookingType
  title: string
  date: string // arrivée, départ ou jour du billet
  time: string
  endDate: string // départ de l'hébergement ou arrivée du trajet, sinon vide
  endTime: string
  notes: string
  file?: { id: string; name: string } // PDF gardé à part (voir fileStore)
}

// Chose à réserver.
export type Todo = {
  id: string
  text: string
  dueDate: string // vide si aucune échéance
  done: boolean
}

export type Member = { id: string; name: string }

// Montants en millièmes (voir money.ts).
export type Expense = {
  id: string
  date: string
  title: string
  amount: number
  currency: string
  rate: number // taux figé à la saisie : 1 « currency » = rate en monnaie des comptes
  payerId: string
  shares: { memberId: string; amount: number }[] // parts, dans la monnaie de la dépense
  repayment?: boolean // remboursement entre deux personnes
}

export type DiaryEntry = { date: string; text: string }

// L'image elle-même est gardée à part (voir fileStore), sous le même identifiant.
export type Photo = { id: string; date: string; caption: string }

export type TripDetails = {
  name: string
  destination: string
  startDate: string
  endDate: string
}

export type Trip = TripDetails & {
  id: string
  activities: Activity[]
  items: Item[]
  // Absents des données créées avant la phase 3.
  bookings?: Booking[]
  todos?: Todo[]
  // Absents des données créées avant la phase 4.
  currency?: string // monnaie des comptes
  members?: Member[]
  expenses?: Expense[]
  // Absents des données créées avant la phase 5.
  diary?: DiaryEntry[]
  photos?: Photo[]
  country?: string // pays choisi pour la fiche d'urgence
  preferences?: Preferences // envies pour l'itinéraire proposé
  updatedAt: string
}

export type Data = { version: 1; trips: Trip[] }

export const emptyData: Data = { version: 1, trips: [] }

export const maxDays = 366
const dayInMs = 24 * 60 * 60 * 1000

function toTime(date: string): number {
  return Date.parse(`${date}T00:00:00Z`)
}

export function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const time = toTime(value)
  // Rejette par exemple le 31 février.
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === value
}

export type DateProblem = 'missing' | 'order' | 'tooLong' | null

export function checkDates(startDate: string, endDate: string): DateProblem {
  if (!isDate(startDate) || !isDate(endDate)) return 'missing'
  if (endDate < startDate) return 'order'
  if ((toTime(endDate) - toTime(startDate)) / dayInMs + 1 > maxDays) return 'tooLong'
  return null
}

// Les calculs se font en UTC pour éviter les décalages dus aux changements d'heure.
export function listDays(startDate: string, endDate: string): string[] {
  if (checkDates(startDate, endDate)) return []
  const days: string[] = []
  for (let time = toTime(startDate); time <= toTime(endDate); time += dayInMs) {
    days.push(new Date(time).toISOString().slice(0, 10))
  }
  return days
}

// Date du jour selon l'horloge du téléphone.
export function today(now = new Date()): string {
  const two = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`
}

// Par heure ; les activités sans heure viennent à la fin, dans l'ordre de saisie.
export function activitiesOn(trip: Trip, date: string): Activity[] {
  return trip.activities
    .filter((a) => a.date === date)
    .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))
}

export function itemsOn(trip: Trip, date: string): Item[] {
  return trip.items.filter((i) => i.date === date)
}

// Nombre d'éléments qui ne seraient plus visibles avec ces dates.
export function countOutside(trip: Trip, startDate: string, endDate: string): number {
  const dated = [...trip.activities, ...trip.items, ...(trip.diary ?? []), ...(trip.photos ?? [])]
  return dated.filter((e) => e.date < startDate || e.date > endDate).length
}

// Ajoute l'élément, ou remplace celui qui a le même identifiant.
export function upsert<T extends { id: string }>(list: T[], element: T): T[] {
  return list.some((e) => e.id === element.id)
    ? list.map((e) => (e.id === element.id ? element : e))
    : [...list, element]
}

type Json = Record<string, unknown>

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasStrings(value: unknown, keys: string[]): value is Json {
  return isObject(value) && keys.every((key) => typeof value[key] === 'string')
}

export function isLocation(value: unknown): value is Location {
  return (
    hasStrings(value, ['label']) &&
    typeof value.lat === 'number' &&
    typeof value.lon === 'number' &&
    Math.abs(value.lat) <= 90 &&
    Math.abs(value.lon) <= 180
  )
}

function isActivity(value: unknown): boolean {
  return (
    hasStrings(value, ['id', 'date', 'time', 'title', 'place', 'notes']) &&
    isDate(value.date as string) &&
    (value.location === undefined || isLocation(value.location))
  )
}

function isItem(value: unknown): boolean {
  return (
    hasStrings(value, ['id', 'date', 'text']) &&
    isDate(value.date as string) &&
    typeof value.done === 'boolean'
  )
}

function isBooking(value: unknown): boolean {
  return (
    hasStrings(value, ['id', 'type', 'title', 'date', 'time', 'endDate', 'endTime', 'notes']) &&
    bookingTypes.includes(value.type as BookingType) &&
    isDate(value.date as string) &&
    (value.endDate === '' || isDate(value.endDate as string)) &&
    (value.file === undefined || hasStrings(value.file, ['id', 'name']))
  )
}

function isTodo(value: unknown): boolean {
  return (
    hasStrings(value, ['id', 'text', 'dueDate']) &&
    (value.dueDate === '' || isDate(value.dueDate as string)) &&
    typeof value.done === 'boolean'
  )
}

function isOptionalList(value: unknown, check: (element: unknown) => boolean): boolean {
  return value === undefined || (Array.isArray(value) && value.every(check))
}

const isCurrency = (value: unknown) => typeof value === 'string' && /^[A-Z]{3}$/.test(value)
const isAmount = (value: unknown) => Number.isSafeInteger(value) && (value as number) >= 0

function isMember(value: unknown): boolean {
  return hasStrings(value, ['id', 'name'])
}

function isExpense(value: unknown): boolean {
  if (!hasStrings(value, ['id', 'date', 'title', 'currency', 'payerId'])) return false
  const { amount, rate, shares } = value
  return (
    isDate(value.date as string) &&
    isCurrency(value.currency) &&
    isAmount(amount) &&
    typeof rate === 'number' &&
    Number.isFinite(rate) &&
    rate > 0 &&
    Array.isArray(shares) &&
    shares.every((s) => hasStrings(s, ['memberId']) && isAmount(s.amount)) &&
    // Les parts doivent faire exactement le total.
    shares.reduce((sum: number, s) => sum + s.amount, 0) === amount
  )
}

// Chaque dépense ne doit citer que des participants du voyage.
function hasKnownMembers(trip: Json): boolean {
  const ids = new Set(((trip.members as Member[]) ?? []).map((m) => m.id))
  return ((trip.expenses as Expense[]) ?? []).every(
    (e) => ids.has(e.payerId) && e.shares.every((s) => ids.has(s.memberId)),
  )
}

function isDiaryEntry(value: unknown): boolean {
  return hasStrings(value, ['date', 'text']) && isDate(value.date as string)
}

function isPhoto(value: unknown): boolean {
  return hasStrings(value, ['id', 'date', 'caption']) && isDate(value.date as string)
}

export function diaryText(trip: Trip, date: string): string {
  return trip.diary?.find((entry) => entry.date === date)?.text ?? ''
}

// Un texte vide retire la page du jour.
export function setDiaryText(trip: Trip, date: string, text: string): Trip {
  const others = (trip.diary ?? []).filter((entry) => entry.date !== date)
  return { ...trip, diary: text ? [...others, { date, text }] : others }
}

export function photosOn(trip: Trip, date: string): Photo[] {
  return (trip.photos ?? []).filter((photo) => photo.date === date)
}

// Ce qu'une réservation représente un jour donné.
export type BookingRole = 'start' | 'end' | 'during'

export function bookingsOn(trip: Trip, date: string): { booking: Booking; role: BookingRole }[] {
  const result: { booking: Booking; role: BookingRole; time: string }[] = []
  for (const booking of trip.bookings ?? []) {
    if (booking.date === date) {
      result.push({ booking, role: 'start', time: booking.time })
    }
    if (booking.endDate === date && (booking.endDate !== booking.date || booking.type === 'stay')) {
      result.push({ booking, role: 'end', time: booking.endTime })
    }
    if (booking.type === 'stay' && booking.date < date && date < booking.endDate) {
      result.push({ booking, role: 'during', time: '' })
    }
  }
  return result
    .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))
    .map(({ booking, role }) => ({ booking, role }))
}

function isTrip(value: unknown): boolean {
  return (
    hasStrings(value, ['id', 'name', 'destination', 'startDate', 'endDate', 'updatedAt']) &&
    checkDates(value.startDate as string, value.endDate as string) === null &&
    Array.isArray(value.activities) &&
    value.activities.every(isActivity) &&
    Array.isArray(value.items) &&
    value.items.every(isItem) &&
    isOptionalList(value.bookings, isBooking) &&
    isOptionalList(value.todos, isTodo) &&
    (value.currency === undefined || isCurrency(value.currency)) &&
    isOptionalList(value.members, isMember) &&
    isOptionalList(value.expenses, isExpense) &&
    isOptionalList(value.diary, isDiaryEntry) &&
    isOptionalList(value.photos, isPhoto) &&
    (value.country === undefined || typeof value.country === 'string') &&
    (value.preferences === undefined || isPreferences(value.preferences)) &&
    // Sans monnaie des comptes, des dépenses n'auraient pas de sens.
    (!(value.expenses as unknown[] | undefined)?.length || value.currency !== undefined) &&
    hasKnownMembers(value)
  )
}

// Lit un texte JSON (mémoire du téléphone ou copie de sécurité). null = illisible.
export function parseData(text: string): Data | null {
  try {
    const value: unknown = JSON.parse(text)
    if (isObject(value) && value.version === 1 && Array.isArray(value.trips)) {
      if (value.trips.every(isTrip)) return value as Data
    }
  } catch {
    // Le texte n'est pas du JSON.
  }
  return null
}

// Une restauration ne supprime jamais un voyage absent de la copie.
export function mergeData(current: Data, incoming: Data): Data {
  return { version: 1, trips: incoming.trips.reduce(upsert, current.trips) }
}
