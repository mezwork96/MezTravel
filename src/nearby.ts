// « Chercher à proximité » : des liens qui ouvrent Google Maps avec la recherche prête.
// Format officiel « Maps URLs », sans clé ni compte :
// https://developers.google.com/maps/documentation/urls/get-started
// Aucune donnée de Google n'est copiée dans l'app.

export const nearbyKinds = [
  { id: 'hotels', icon: '🏨', it: 'Hotel', en: 'Hotels', fr: 'Hôtels' },
  { id: 'stations', icon: '🚉', it: 'Stazioni', en: 'Train stations', fr: 'Gares' },
  { id: 'transit', icon: '🚌', it: 'Fermate dei mezzi', en: 'Public transport stops', fr: 'Arrêts de transport' },
  { id: 'restaurants', icon: '🍽️', it: 'Ristoranti', en: 'Restaurants', fr: 'Restaurants' },
  { id: 'bars', icon: '🍸', it: 'Bar', en: 'Bars', fr: 'Bars' },
  { id: 'cafes', icon: '☕', it: 'Caffè', en: 'Cafés', fr: 'Cafés' },
  { id: 'nightlife', icon: '🪩', it: 'Discoteche', en: 'Night clubs', fr: 'Discothèques' },
  { id: 'convenience', icon: '🏪', it: 'Minimarket', en: 'Convenience stores', fr: 'Supérettes' },
  { id: 'supermarkets', icon: '🛒', it: 'Supermercati', en: 'Supermarkets', fr: 'Supermarchés' },
  { id: 'atm', icon: '🏧', it: 'Bancomat', en: 'ATM', fr: 'Distributeurs de billets' },
  { id: 'pharmacies', icon: '💊', it: 'Farmacie', en: 'Pharmacies', fr: 'Pharmacies' },
  { id: 'hospitals', icon: '🏥', it: 'Ospedali', en: 'Hospitals', fr: 'Hôpitaux' },
  { id: 'toilets', icon: '🚻', it: 'Bagni pubblici', en: 'Public toilets', fr: 'Toilettes publiques' },
  { id: 'lockers', icon: '🧳', it: 'Depositi bagagli', en: 'Luggage lockers', fr: 'Consignes à bagages' },
  { id: 'parking', icon: '🅿️', it: 'Parcheggi', en: 'Parking', fr: 'Parkings' },
  { id: 'sights', icon: '📸', it: 'Cose da vedere', en: 'Things to see', fr: 'À voir' },
] as const

const near = { it: 'vicino a', en: 'near', fr: 'près de' }

// Sans lieu, Google Maps cherche autour de la zone qu'il affiche.
export function mapsSearch(what: string, where: string, language: keyof typeof near): string {
  const query = where.trim() ? `${what} ${near[language]} ${where.trim()}` : what
  return `https://www.google.com/maps/search/?${new URLSearchParams({ api: '1', query })}`
}
