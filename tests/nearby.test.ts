import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mapsSearch, nearbyKinds } from '../src/nearby.ts'

test('prépare une recherche Google Maps au format officiel', () => {
  const url = new URL(mapsSearch('Ristoranti', ' Senso-ji & Asakusa, Tokyo ', 'it'))
  assert.equal(url.origin + url.pathname, 'https://www.google.com/maps/search/')
  assert.equal(url.searchParams.get('api'), '1')
  assert.equal(url.searchParams.get('query'), 'Ristoranti vicino a Senso-ji & Asakusa, Tokyo')
  assert.equal(new URL(mapsSearch('Bars', '', 'en')).searchParams.get('query'), 'Bars')
})

test('les types de recherche sont uniques et traduits', () => {
  assert.equal(new Set(nearbyKinds.map((k) => k.id)).size, nearbyKinds.length)
  assert.ok(nearbyKinds.every((k) => k.it && k.en && k.fr && k.icon))
})
