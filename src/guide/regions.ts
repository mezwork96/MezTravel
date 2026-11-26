// Les grandes régions du Japon, du nord au sud, pour classer les destinations.
import type { GuideDestination, Localized } from './types.ts'

export const regions: ({ id: string } & Localized)[] = [
  { id: 'Hokkaido', it: 'Hokkaido (estremo nord)', en: 'Hokkaido (far north)', fr: 'Hokkaido (extrême nord)' },
  { id: 'Tohoku', it: 'Tohoku (nord)', en: 'Tohoku (north)', fr: 'Tohoku (nord)' },
  { id: 'Kanto', it: 'Kanto (zona di Tokyo)', en: 'Kanto (Tokyo area)', fr: 'Kanto (région de Tokyo)' },
  { id: 'Chubu', it: 'Chubu (centro)', en: 'Chubu (centre)', fr: 'Chubu (centre)' },
  { id: 'Kansai', it: 'Kansai (Kyoto e Osaka)', en: 'Kansai (Kyoto and Osaka)', fr: 'Kansai (Kyoto et Osaka)' },
  { id: 'Chugoku', it: 'Chugoku (ovest)', en: 'Chugoku (west)', fr: 'Chugoku (ouest)' },
  { id: 'Shikoku', it: 'Isola di Shikoku', en: 'Shikoku island', fr: 'Île de Shikoku' },
  { id: 'Kyushu', it: 'Isola di Kyushu (sud)', en: 'Kyushu island (south)', fr: 'Île de Kyushu (sud)' },
  { id: 'Okinawa', it: 'Okinawa (isole tropicali)', en: 'Okinawa (tropical islands)', fr: 'Okinawa (îles tropicales)' },
]

// Les destinations regroupées par région, par ordre alphabétique dans chacune.
export function byRegion(destinations: GuideDestination[], language: keyof Localized) {
  return regions
    .map((region) => ({
      id: region.id,
      label: region[language],
      destinations: destinations
        .filter((d) => d.region === region.id)
        .sort((a, b) => a.name.localeCompare(b.name, language)),
    }))
    .filter((group) => group.destinations.length > 0)
}
