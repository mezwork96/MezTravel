// Forme d'un guide de pays. Un autre pays pourra être ajouté avec la même forme.
export type Localized = { it: string; en: string; fr: string }

export type GuideDestination = {
  id: string
  name: string
  region: string
  minNights: number
  idealNights: number
  about: Localized
  source: string
}

export type GuidePlace = {
  id: string
  destination: string
  name: string
  area: string
  interests: string[]
  hours: number // durée indicative de la visite
  slot: 'any' | 'morning' | 'afternoon' | 'evening'
  about: Localized
  note: Localized
  source: string
  checked: boolean // la page a été ouverte pendant la recherche
  when?: Availability
}

export type Availability = {
  months?: number[] // 1 à 12
  from?: string // MM-JJ, avec « to » : dates d'un événement ou d'une saison
  to?: string
  someDays?: boolean // certains jours seulement : jamais placé automatiquement
  closed?: string[][] // périodes de fermeture [début, fin] en AAAA-MM-JJ
  closedWeekdays?: number[] // jours de fermeture habituels, 0 = dimanche
}

export type GuideTravel = { from: string; to: string; minutes: number; how: string; source?: string }

export type GuideSection = {
  id: string
  icon: string
  title: Localized
  points: { text: Localized; source: string; checked: boolean; changing: boolean }[]
}

export type Guide = {
  checkedOn: string
  destinations: GuideDestination[]
  places: GuidePlace[]
  travel: GuideTravel[]
  sections: GuideSection[]
}
