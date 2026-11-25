import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isWebUrl, readUrl } from '../src/answer.ts'
import { defaultPreferences, toggleInterest } from '../src/interests.ts'
import { buildRequest, readProposals } from '../src/proposals.ts'
import { buildRouteRequest, emptyWishes, readRoutes, stageDays, stageOn } from '../src/stages.ts'
import { listDays, parseData, type Trip } from '../src/trips.ts'

const days = listDays('2027-04-01', '2027-04-05')
const stages = [
  { city: 'Tokyo', nights: 2 },
  { city: 'Osaka', nights: 2, area: 'Namba', transfer: 'train' },
]

test('répartit les jours selon les nuits', () => {
  assert.deepEqual(stageDays(days, stages).map((s) => s.days), [
    ['2027-04-01', '2027-04-02'],
    ['2027-04-03', '2027-04-04', '2027-04-05'],
  ])
  assert.equal(stageOn(days, stages, '2027-04-01')!.from, undefined)
  assert.equal(stageOn(days, stages, '2027-04-03')!.from, 'Tokyo')
  assert.equal(stageOn(days, stages, '2027-04-05')!.stage.city, 'Osaka')
  // Si les dates changent, on n'invente pas de ville pour les jours en plus.
  assert.equal(stageOn(listDays('2027-04-01', '2027-04-08'), stages, '2027-04-07'), undefined)
  assert.equal(stageOn(listDays('2027-04-01', '2027-04-02'), stages, '2027-04-02')!.stage.city, 'Tokyo')
  assert.equal(stageOn(days, [], '2027-04-01'), undefined)
})

test('n’accepte que des adresses web comme sources', () => {
  assert.ok(isWebUrl('https://www.japan.travel/fr/'))
  for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'https://', 'http://local', 'https://a b.com', 5]) {
    assert.equal(isWebUrl(bad), false, String(bad))
  }
  assert.equal(readUrl('[site](https://example.org/page)'), 'https://example.org/page')
  assert.equal(readUrl('javascript:alert(1)'), undefined)
  assert.equal(readUrl('…'), undefined)
})

test('lit des parcours et écarte ceux qui sont inutilisables', () => {
  const answer = JSON.stringify({
    webSearch: false,
    routes: [
      { name: 'Classique', stages: [{ city: 'Tokyo', nights: '7', source: 'javascript:x' }, { city: 'Nara', nights: 2, why: 'temples' }] },
      { name: 'Faux', stages: [{ city: 'Kyoto', nights: 0 }] },
      { name: 'Vide', stages: [] },
    ],
  })
  const result = readRoutes(`Voici : ${answer}`)!
  assert.equal(result.searched, false)
  assert.deepEqual(result.routes.map((r) => r.name), ['Classique'])
  assert.deepEqual(result.routes[0].stages[0], { city: 'Tokyo', nights: 7 })
  assert.equal(readRoutes('{"routes": []}'), null)
  assert.equal(readRoutes('{"routes": [{"stages"'), null)
})

test('demandes : nuits exactes, villes du jour et sources', () => {
  const preferences = toggleInterest(defaultPreferences, 'temples')
  const trip: Trip = {
    id: 'a', name: 'NOM-PRIVE', destination: 'Japon', startDate: '2027-04-01', endDate: '2027-04-05',
    activities: [], items: [], stages, updatedAt: 'x',
  }
  const route = buildRouteRequest(trip, 4, preferences, { ...emptyWishes, arrival: 'Tokyo' }, 'it')
  for (const part of ['Japon', 'esattamente 4', 'Città di arrivo: Tokyo', 'Templi', 'siti ufficiali']) {
    assert.ok(route.includes(part), part)
  }
  assert.ok(!route.includes('NOM-PRIVE') && !route.includes('Città di partenza'))
  const osaka = buildRequest(trip, preferences, 'plan', 'it', undefined, stageDays(days, stages)[1].days)
  assert.ok(osaka.includes('2027-04-03 a Osaka (arrivo quel giorno da Tokyo, dormo in zona Namba)'))
  assert.ok(!osaka.includes('2027-04-02') && osaka.includes('"source"'))
  const read = readProposals(
    '{"activities":[{"date":"2027-04-01","title":"a","source":"https://example.org/x"},{"date":"2027-04-01","title":"b","source":"javascript:1"}]}',
    days,
  )!
  assert.equal(read.proposals[0].source, 'https://example.org/x')
  assert.ok(!('source' in read.proposals[1]))
  assert.ok(read.searched)
})

test('vérifie étapes et sources dans les données et les copies', () => {
  const data = (extra: object, activity: object = {}) =>
    JSON.stringify({
      version: 1,
      trips: [{ id: 'a', name: 'J', destination: 'T', startDate: '2027-04-01', endDate: '2027-04-02', items: [], updatedAt: 'x',
        activities: [{ id: '1', date: '2027-04-01', time: '', title: 't', place: '', notes: '', ...activity }], ...extra }],
    })
  assert.ok(parseData(data({ stages, routeWishes: emptyWishes }, { source: 'https://example.org' })))
  assert.equal(parseData(data({}, { source: 'javascript:alert(1)' })), null)
  assert.equal(parseData(data({ stages: [{ city: 'A', nights: 1, source: 'javascript:1' }] })), null)
  assert.equal(parseData(data({ routeWishes: { arrival: 1 } })), null)
})

test('le conseiller interroge d’abord et attend la confirmation', () => {
  const trip: Trip = {
    id: 'a', name: 'x', destination: 'Japon', startDate: '2027-04-01', endDate: '2027-04-05',
    activities: [], items: [], updatedAt: 'x',
  }
  const preferences = toggleInterest(defaultPreferences, 'wellness')
  const open = buildRouteRequest(trip, 4, preferences, emptyWishes, 'it')
  assert.ok(open.includes('Hai già un’idea del percorso'))
  assert.ok(open.includes('UNA sola domanda') && open.includes('«confermo»'))
  const withIdea = buildRouteRequest(trip, 4, preferences, { ...emptyWishes, idea: 'Tokyo poi Nikko' }, 'it')
  assert.ok(withIdea.includes('La mia idea di percorso: Tokyo poi Nikko'))
  assert.ok(!withIdea.includes('La prima domanda è'))
  for (const [language, word] of [['en', 'I confirm'], ['fr', 'je confirme']] as const) {
    assert.ok(buildRequest(trip, preferences, 'plan', language).includes(word))
    assert.ok(buildRouteRequest(trip, 4, preferences, emptyWishes, language).includes(word))
  }
  assert.ok(buildRequest(trip, preferences, 'pick', 'it').includes('«confermo»'))
})
