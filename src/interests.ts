// Envies pour l'itinéraire proposé : catégories, rythme et nombre de personnes.
// Sans dépendance à l'écran (donc testable).
import { isAnswers, type Answers } from './questions.ts'

// Les identifiants sont enregistrés dans les voyages : ne pas les renommer.
export const interests = [
  { id: 'museums', icon: '🖼️', it: 'Musei', en: 'Museums', fr: 'Musées' },
  { id: 'modernArt', icon: '🎨', it: 'Arte moderna', en: 'Modern art', fr: 'Art moderne' },
  { id: 'historic', icon: '🏰', it: 'Luoghi storici', en: 'Historic sites', fr: 'Sites historiques' },
  { id: 'temples', icon: '⛩️', it: 'Templi e luoghi sacri', en: 'Temples and sacred places', fr: 'Temples et lieux sacrés' },
  { id: 'architecture', icon: '🏛️', it: 'Architettura', en: 'Architecture', fr: 'Architecture' },
  { id: 'neighborhoods', icon: '🚶', it: 'Quartieri da esplorare', en: 'Neighbourhoods to explore', fr: 'Quartiers à explorer' },
  { id: 'viewpoints', icon: '📸', it: 'Panorami e punti foto', en: 'Views and photo spots', fr: 'Panoramas et photos' },
  { id: 'nature', icon: '🌳', it: 'Natura e parchi', en: 'Nature and parks', fr: 'Nature et parcs' },
  { id: 'hiking', icon: '🥾', it: 'Escursioni', en: 'Hiking', fr: 'Randonnées' },
  { id: 'beaches', icon: '🏖️', it: 'Spiagge', en: 'Beaches', fr: 'Plages' },
  { id: 'waterSports', icon: '🤿', it: 'Attività in acqua', en: 'Water activities', fr: 'Activités nautiques' },
  { id: 'winterSports', icon: '⛷️', it: 'Neve e sport invernali', en: 'Snow and winter sports', fr: 'Neige et sports d’hiver' },
  { id: 'activeSports', icon: '🚴', it: 'Sport da praticare', en: 'Sports to try', fr: 'Sports à pratiquer' },
  { id: 'sportEvents', icon: '🏟️', it: 'Eventi sportivi', en: 'Sporting events', fr: 'Événements sportifs' },
  { id: 'horses', icon: '🐴', it: 'Cavalli ed equitazione', en: 'Horses and riding', fr: 'Chevaux et équitation' },
  { id: 'animals', icon: '🐠', it: 'Animali e acquari', en: 'Animals and aquariums', fr: 'Animaux et aquariums' },
  { id: 'themeParks', icon: '🎢', it: 'Parchi a tema', en: 'Theme parks', fr: 'Parcs à thème' },
  { id: 'kids', icon: '🧒', it: 'Attività per bambini', en: 'Activities for children', fr: 'Activités pour enfants' },
  { id: 'gaming', icon: '🎮', it: 'Gaming e anime', en: 'Gaming and anime', fr: 'Jeux vidéo et anime' },
  { id: 'filmSpots', icon: '🎬', it: 'Luoghi di film e serie', en: 'Film and series locations', fr: 'Lieux de films et séries' },
  { id: 'shopping', icon: '🛍️', it: 'Shopping', en: 'Shopping', fr: 'Shopping' },
  { id: 'markets', icon: '🧺', it: 'Mercati', en: 'Markets', fr: 'Marchés' },
  { id: 'streetFood', icon: '🍢', it: 'Cibo di strada', en: 'Street food', fr: 'Cuisine de rue' },
  { id: 'restaurants', icon: '🍽️', it: 'Ristoranti tipici', en: 'Local restaurants', fr: 'Restaurants typiques' },
  { id: 'cafes', icon: '☕', it: 'Caffè e dolci', en: 'Cafés and sweets', fr: 'Cafés et douceurs' },
  { id: 'foodClasses', icon: '🧑‍🍳', it: 'Corsi di cucina e degustazioni', en: 'Cooking classes and tastings', fr: 'Cours de cuisine et dégustations' },
  { id: 'crafts', icon: '🏺', it: 'Laboratori e tradizioni', en: 'Workshops and traditions', fr: 'Ateliers et traditions' },
  { id: 'bars', icon: '🍸', it: 'Bar', en: 'Bars', fr: 'Bars' },
  { id: 'nightlife', icon: '🪩', it: 'Discoteche e vita notturna', en: 'Clubs and nightlife', fr: 'Discothèques et vie nocturne' },
  { id: 'shows', icon: '🎭', it: 'Concerti e spettacoli', en: 'Concerts and shows', fr: 'Concerts et spectacles' },
  { id: 'festivals', icon: '🎉', it: 'Feste ed eventi locali', en: 'Festivals and local events', fr: 'Fêtes et événements locaux' },
  { id: 'wellness', icon: '♨️', it: 'Terme, onsen e relax', en: 'Spas, onsen and relaxing', fr: 'Thermes, onsen et détente' },
  { id: 'dayTrips', icon: '🚆', it: 'Gite fuori città', en: 'Day trips', fr: 'Excursions hors de la ville' },
] as const

// Les mêmes catégories, rangées par famille pour l'écran.
export const interestGroups = [
  { it: 'Cultura e storia', en: 'Culture and history', fr: 'Culture et histoire', ids: ['museums', 'modernArt', 'historic', 'temples', 'architecture', 'crafts'] },
  { it: 'In città', en: 'In town', fr: 'En ville', ids: ['neighborhoods', 'viewpoints', 'shopping', 'markets', 'gaming', 'filmSpots'] },
  { it: 'Natura, sport e animali', en: 'Nature, sport and animals', fr: 'Nature, sport et animaux', ids: ['nature', 'hiking', 'beaches', 'waterSports', 'winterSports', 'activeSports', 'sportEvents', 'horses', 'animals'] },
  { it: 'Cibo', en: 'Food', fr: 'Cuisine', ids: ['restaurants', 'streetFood', 'cafes', 'foodClasses'] },
  { it: 'Sera e spettacoli', en: 'Evenings and shows', fr: 'Soirées et spectacles', ids: ['bars', 'nightlife', 'shows', 'festivals'] },
  { it: 'Divertimento e relax', en: 'Fun and relaxing', fr: 'Loisirs et détente', ids: ['themeParks', 'kids', 'wellness', 'dayTrips'] },
]

export const maxTop = 3

export const paces = ['calm', 'normal', 'intense'] as const
export type Pace = (typeof paces)[number]

export const maxPeople = 99

export type Preferences = {
  people: number
  pace: Pace
  interests: string[] // pour tout le voyage
  // Jours qui ont leurs propres envies : elles remplacent celles du voyage.
  days: { date: string; interests: string[] }[]
  // Absents des données créées avant les questions précises.
  top?: string[] // les envies qui comptent le plus (3 au maximum)
  answers?: Answers
  // Réponses propres à une journée : elles remplacent celles du voyage.
  dayAnswers?: DayAnswers[]
}

export type DayAnswers = { date: string; pace?: Pace; answers: Answers }

export function dayAnswersOn(preferences: Preferences, date: string): DayAnswers | undefined {
  return preferences.dayAnswers?.find((day) => day.date === date)
}

// Rythme et réponses valables un jour donné.
export function settingsOn(preferences: Preferences, date: string): { pace: Pace; answers: Answers } {
  const own = dayAnswersOn(preferences, date)
  return {
    pace: own?.pace ?? preferences.pace,
    answers: { ...preferences.answers, ...own?.answers },
  }
}

export function setDay(preferences: Preferences, next: DayAnswers): Preferences {
  const others = (preferences.dayAnswers ?? []).filter((day) => day.date !== next.date)
  const empty = !next.pace && Object.keys(next.answers).length === 0
  return { ...preferences, dayAnswers: empty ? others : [...others, next] }
}

export function toggleTop(preferences: Preferences, id: string): Preferences {
  const top = preferences.top ?? []
  if (top.includes(id)) return { ...preferences, top: top.filter((other) => other !== id) }
  // Seules les envies encore choisies comptent dans la limite.
  const kept = top.filter((other) => preferences.interests.includes(other))
  return kept.length >= maxTop ? preferences : { ...preferences, top: [...kept, id] }
}

export const defaultPreferences: Preferences = { people: 2, pace: 'normal', interests: [], days: [] }

export function ownInterests(preferences: Preferences, date: string): string[] | undefined {
  return preferences.days.find((day) => day.date === date)?.interests
}

// Envies valables un jour donné.
export function interestsOn(preferences: Preferences, date: string): string[] {
  return ownInterests(preferences, date) ?? preferences.interests
}

const toggled = (list: string[], id: string) =>
  list.includes(id) ? list.filter((other) => other !== id) : [...list, id]

// Sans date : tout le voyage. Un jour sans aucune envie propre reprend celles du voyage.
export function toggleInterest(preferences: Preferences, id: string, date?: string): Preferences {
  if (!date) return { ...preferences, interests: toggled(preferences.interests, id) }
  const chosen = toggled(ownInterests(preferences, date) ?? [], id)
  const others = preferences.days.filter((day) => day.date !== date)
  return { ...preferences, days: chosen.length ? [...others, { date, interests: chosen }] : others }
}

export function clearInterests(preferences: Preferences, date?: string): Preferences {
  if (!date) return { ...preferences, interests: [] }
  return { ...preferences, days: preferences.days.filter((day) => day.date !== date) }
}

const isStrings = (value: unknown) =>
  Array.isArray(value) && value.every((element) => typeof element === 'string')

export function isPreferences(value: any): boolean {
  return (
    Number.isInteger(value?.people) &&
    value.people >= 1 &&
    value.people <= maxPeople &&
    paces.includes(value.pace) &&
    isStrings(value.interests) &&
    Array.isArray(value.days) &&
    value.days.every((day: any) => typeof day?.date === 'string' && isStrings(day.interests)) &&
    (value.top === undefined || isStrings(value.top)) &&
    (value.answers === undefined || isAnswers(value.answers)) &&
    (value.dayAnswers === undefined ||
      (Array.isArray(value.dayAnswers) &&
        value.dayAnswers.every(
          (day: any) =>
            typeof day?.date === 'string' &&
            (day.pace === undefined || paces.includes(day.pace)) &&
            isAnswers(day.answers),
        )))
  )
}
