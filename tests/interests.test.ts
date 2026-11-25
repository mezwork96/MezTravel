import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  clearInterests,
  defaultPreferences,
  interests,
  interestsOn,
  isPreferences,
  ownInterests,
  toggleInterest,
} from '../src/interests.ts'
import { parseData } from '../src/trips.ts'

test('les catégories sont uniques et traduites', () => {
  assert.equal(new Set(interests.map((i) => i.id)).size, interests.length)
  assert.ok(interests.every((i) => i.it && i.en && i.fr && i.icon))
})

test('un jour reprend les envies du voyage tant qu’il n’a pas les siennes', () => {
  const trip = toggleInterest(defaultPreferences, 'museums')
  assert.deepEqual(interestsOn(trip, '2027-04-02'), ['museums'])
  const day = toggleInterest(trip, 'beaches', '2027-04-02')
  assert.deepEqual(interestsOn(day, '2027-04-02'), ['beaches'])
  assert.deepEqual(interestsOn(day, '2027-04-03'), ['museums'])
  // Retirer la dernière envie du jour le remet comme le voyage.
  const emptied = toggleInterest(day, 'beaches', '2027-04-02')
  assert.equal(ownInterests(emptied, '2027-04-02'), undefined)
  assert.deepEqual(emptied.days, [])
  assert.deepEqual(clearInterests(day, '2027-04-02').days, [])
  assert.deepEqual(clearInterests(day).interests, [])
  assert.deepEqual(defaultPreferences.interests, [])
})

test('vérifie les envies lues dans les données et les copies', () => {
  assert.ok(isPreferences(defaultPreferences))
  for (const bad of [
    null,
    { ...defaultPreferences, people: 0 },
    { ...defaultPreferences, people: 1.5 },
    { ...defaultPreferences, pace: 'fou' },
    { ...defaultPreferences, interests: [3] },
    { ...defaultPreferences, days: [{ date: '2027-04-01' }] },
  ]) {
    assert.equal(isPreferences(bad), false)
  }
  const data = (preferences?: unknown) =>
    JSON.stringify({
      version: 1,
      trips: [{ id: 'a', name: 'J', destination: 'T', startDate: '2027-04-01', endDate: '2027-04-02', activities: [], items: [], updatedAt: 'x', preferences }],
    })
  assert.ok(parseData(data()))
  assert.ok(parseData(data(defaultPreferences)))
  assert.equal(parseData(data({ people: 'deux' })), null)
})
