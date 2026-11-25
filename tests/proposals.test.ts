import assert from 'node:assert/strict'
import { test } from 'node:test'
import { defaultPreferences, toggleInterest } from '../src/interests.ts'
import { alreadyPlanned, buildRequest, readProposals, requestDays } from '../src/proposals.ts'
import type { Trip } from '../src/trips.ts'

const trip: Trip = {
  id: 'a',
  name: 'NOM-PRIVE',
  destination: 'Tokyo',
  startDate: '2027-04-01',
  endDate: '2027-04-03',
  activities: [
    { id: '1', date: '2027-04-01', time: '09:00', title: 'Senso-ji', place: 'LIEU-PRIVE', notes: 'NOTE-PRIVEE' },
  ],
  items: [],
  bookings: [
    { id: 'b', type: 'stay', title: 'HOTEL-PRIVE', date: '2027-04-01', time: '', endDate: '', endTime: '', notes: '' },
  ],
  updatedAt: 'x',
}
const days = ['2027-04-01', '2027-04-02', '2027-04-03']

test('la demande ne contient que ce qui est annoncé', () => {
  const preferences = toggleInterest(defaultPreferences, 'museums')
  const text = buildRequest(trip, preferences, 'plan', 'it')
  for (const expected of ['Tokyo', 'Musei', '2027-04-03', '09:00 Senso-ji']) {
    assert.ok(text.includes(expected), expected)
  }
  assert.ok(!/PRIVE/.test(text))
  assert.ok(buildRequest(trip, preferences, 'pick', 'fr', '2027-04-02').includes('Musées'))
  assert.ok(!buildRequest(trip, preferences, 'plan', 'en', '2027-04-02').includes('2027-04-03'))
})

test('ne demande que les jours qui ont des envies', () => {
  assert.deepEqual(requestDays(trip, defaultPreferences), [])
  const preferences = toggleInterest(defaultPreferences, 'beaches', '2027-04-02')
  assert.deepEqual(requestDays(trip, preferences), ['2027-04-02'])
})

test('lit une réponse entourée de texte et vérifie chaque entrée', () => {
  const answer = `Voici :\n\`\`\`json\n${JSON.stringify({
    activities: [
      { date: '2027-04-02', time: '', title: 'Sans heure' },
      { date: '2027-04-02', time: '9:30', title: ' Musée ', place: 'Ueno', notes: 'n'.repeat(900) },
      { date: '2027-04-01', time: '25:00', title: 'Heure fausse', place: 5, extra: 'x' },
      { date: '2027-05-01', title: 'Hors voyage' },
      { date: '2027-04-01', title: '' },
      null,
    ],
  })}\n\`\`\``
  const result = readProposals(answer, days)!
  assert.equal(result.ignored, 3)
  assert.deepEqual(result.proposals.map((p) => [p.title, p.time]), [
    ['Heure fausse', ''],
    ['Musée', '09:30'],
    ['Sans heure', ''],
  ])
  assert.equal(result.proposals[1].notes.length, 500)
  assert.deepEqual(Object.keys(result.proposals[0]).sort(), ['date', 'notes', 'place', 'time', 'title'])
})

test('refuse une réponse illisible ou coupée', () => {
  for (const bad of ['', 'bonjour', '{"activities": [{"title": "a"', '{"autre": []}', '[1,2]']) {
    assert.equal(readProposals(bad, days), null)
  }
})

test('repère une activité déjà au programme', () => {
  assert.ok(alreadyPlanned(trip, { date: '2027-04-01', title: 'senso-ji' }))
  assert.ok(!alreadyPlanned(trip, { date: '2027-04-02', title: 'Senso-ji' }))
})
