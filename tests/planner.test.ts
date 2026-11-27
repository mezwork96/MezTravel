import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { isWebUrl } from '../src/answer.ts'
import { defaultPreferences, interests, paces, type Preferences } from '../src/interests.ts'
import { byRegion, regions } from '../src/guide/regions.ts'
import type { Guide } from '../src/guide/types.ts'
import { automaticRoute, extraText, findDestination, isAvailable, guideCovers, planDays, proposeRoutes, toStages, travelTimes } from '../src/planner.ts'
import { isStage, totalNights } from '../src/stages.ts'
import { listDays, parseData, replaceable, replacedBy, without, type Trip } from '../src/trips.ts'

const guide: Guide = JSON.parse(readFileSync(new URL('../src/guide/japan.json', import.meta.url), 'utf-8'))
const likes = (...ids: string[]): Preferences => ({ ...defaultPreferences, interests: ids })
const none = { include: [], arrival: '', departure: '' }

const trip = (changes: Partial<Trip> = {}): Trip => ({
  id: 'a', name: 'J', destination: 'Giappone', startDate: '2027-04-01', endDate: '2027-04-21',
  activities: [], items: [], updatedAt: 'x', ...changes,
})

test('le guide est cohérent', () => {
  const ids = new Set(guide.destinations.map((d) => d.id))
  const known = new Set<string>(interests.map((i) => i.id))
  assert.equal(new Set(guide.places.map((p) => p.id)).size, guide.places.length)
  for (const p of guide.places) {
    assert.ok(ids.has(p.destination), p.id)
    assert.ok(p.interests.length && p.interests.every((i) => known.has(i)), p.id)
    assert.ok(isWebUrl(p.source), p.id)
    assert.ok(p.about.it && p.about.en && p.about.fr, p.id)
  }
  assert.ok(guide.sections.every((s) => s.points.every((x) => isWebUrl(x.source) && x.text.it)))
  const time = travelTimes(guide)
  for (const a of ids) for (const b of ids) assert.ok(time(a, b) < 24 * 60, `${a}-${b}`)
})

test('les 47 préfectures sont toutes dans le guide, avec des lieux', () => {
  const covered = new Set<string>()
  for (const d of guide.destinations) {
    assert.ok(regions.some((r) => r.id === d.region), d.id)
    assert.ok(d.prefectures.length, d.id)
    assert.ok(guide.places.filter((p) => p.destination === d.id).length >= 5, d.id)
    for (const p of d.prefectures) covered.add(p)
  }
  assert.equal(covered.size, 47, [...covered].sort().join())
  assert.equal(byRegion(guide.destinations, 'it').flatMap((g) => g.destinations).length, guide.destinations.length)
  assert.equal(findDestination(guide, 'Gunma')?.id, 'kusatsu')
  assert.equal(findDestination(guide, 'Aichi')?.id, 'nagoya')
  assert.equal(findDestination(guide, 'Hyogo'), undefined)
})

const plan = (answers: Record<string, string>, changes: Partial<Trip> = {}, prefs = likes('temples', 'nightlife', 'hiking', 'museums')) => {
  const t = trip({ destination: 'Tokyo', startDate: '2027-04-01', endDate: '2027-04-04', ...changes })
  return planDays(guide, t, { ...prefs, answers }, listDays(t.startDate, t.endDate), 'plan', 'it')
}
const placeOf = (title: string) => guide.places.find((p) => p.name === title)!

test('les réponses aux questions changent l’itinéraire', () => {
  assert.equal(plan({ start: 'early' }).proposals[0].time, '08:00')
  assert.equal(plan({ start: 'late' }).proposals[0].time, '11:00')
  assert.ok(plan({ evening: 'never' }).proposals.every((p) => placeOf(p.title).slot !== 'evening'))
  assert.ok(plan({ walking: 'little' }).proposals.every((p) => !placeOf(p.title).interests.includes('hiking')))
  assert.ok(
    plan({ children: 'yes' }).proposals.every(
      (p) => !placeOf(p.title).interests.some((i) => i === 'bars' || i === 'nightlife'),
    ),
  )
  const lunches = plan({ lunch: 'yes' }, {}, likes('temples', 'museums')).proposals.filter((p) => p.notes.startsWith('Per pranzo.'))
  assert.ok(lunches.length >= 2)
  assert.ok(lunches.every((p) => p.time >= '11:30' && p.time <= '13:30'), lunches.map((p) => p.time).join())
})

test('les réponses d’une journée ne valent que ce jour-là', () => {
  const prefs = { ...likes('temples', 'museums'), dayAnswers: [{ date: '2027-04-02', pace: 'calm' as const, answers: { start: 'late' } }] }
  const days = plan({}, {}, prefs).proposals
  assert.equal(days.find((p) => p.date === '2027-04-02')!.time, '11:00')
  assert.ok(days.find((p) => p.date === '2027-04-01')!.time < '11:00')
  assert.ok(days.filter((p) => p.date === '2027-04-02').length <= 2)
})

test('un lieu favori est placé même hors des envies, sinon il est signalé', () => {
  const favourite = guide.places.find((p) => p.destination === 'tokyo' && !p.when && p.interests.includes('themeParks'))!
  const result = plan({}, { mustDo: [favourite.id] }, likes('temples'))
  assert.ok(result.proposals.some((p) => p.title === favourite.name))
  assert.deepEqual(result.missed, [])
  const far = guide.places.find((p) => p.destination === 'sapporo' && !p.when)!
  assert.deepEqual(plan({}, { mustDo: [far.id] }, likes('temples')).missed, [far.name])
})

test('les questions et les favoris sont vérifiés dans les données', () => {
  const good = trip({ mustDo: ['a'], preferences: { ...likes('temples'), top: ['temples'], answers: { start: 'early' }, dayAnswers: [{ date: '2027-04-01', answers: { evening: 'never' } }] } })
  const read = (t: unknown) => parseData(JSON.stringify({ version: 1, trips: [t] }))
  assert.ok(read(good))
  assert.equal(read({ ...good, mustDo: [3] }), null)
  assert.equal(read({ ...good, preferences: { ...good.preferences!, answers: { start: 'midnight' } } }), null)
})

test('remplacer ne vide jamais un jour qui ne reçoit rien', () => {
  const old = ['2027-04-01', '2027-04-02', '2027-04-02'].map((date, i) => ({
    id: `${i}`, date, time: '', title: `t${i}`, place: '', notes: '', auto: true,
  }))
  assert.deepEqual(replacedBy(old, ['2027-04-02']).map((a) => a.id), ['1', '2'])
  assert.deepEqual(replacedBy(old, []), [])
})

test('une activité cachée par un changement de dates ne bloque pas les idées', () => {
  const kyoto = trip({ destination: 'Kyoto', startDate: '2027-04-01', endDate: '2027-04-02' })
  const days = listDays(kyoto.startDate, kyoto.endDate)
  const first = planDays(guide, kyoto, likes('temples'), days, 'plan', 'it').proposals
  const hidden = first.map((p, i) => ({ ...p, id: `h${i}`, date: '2027-03-01' }))
  const again = planDays(guide, { ...kyoto, activities: hidden }, likes('temples'), days, 'plan', 'it')
  assert.deepEqual(again.proposals.map((p) => p.title), first.map((p) => p.title))
})

test('les parcours ont exactement le bon nombre de nuits', () => {
  for (const nights of [1, 2, 3, 6, 10, 20, 40, 90]) {
    for (const pace of paces) {
      const routes = proposeRoutes(guide, nights, { ...likes('temples', 'wellness'), pace }, none)
      assert.ok(routes.length > 0, `${nights} ${pace}`)
      for (const route of routes) {
        const stages = toStages(guide, route, 'it')
        assert.equal(totalNights(stages), nights, `${nights} ${pace} ${route.ids}`)
        assert.ok(stages.every(isStage))
        assert.equal(new Set(route.ids).size, route.ids.length)
      }
    }
  }
  assert.deepEqual(proposeRoutes(guide, 0, likes(), none), [])
})

test('respecte les villes demandées, l’arrivée et le départ', () => {
  const choices = { include: ['hiroshima'], arrival: 'tokyo', departure: 'osaka' }
  for (const route of proposeRoutes(guide, 14, likes('museums'), choices)) {
    assert.equal(route.ids[0], 'tokyo')
    assert.equal(route.ids[route.ids.length - 1], 'osaka')
    assert.ok(route.ids.includes('hiroshima'))
  }
})

test('les envies changent le parcours', () => {
  const beach = proposeRoutes(guide, 20, likes('beaches', 'waterSports'), none)
  const temples = proposeRoutes(guide, 20, likes('temples'), none)
  assert.notDeepEqual(beach.map((r) => r.ids), temples.map((r) => r.ids))
  assert.ok(temples.some((r) => r.ids.includes('kyoto')))
})

test('crée des journées dans la bonne ville, sans répétition', () => {
  const preferences = likes('temples', 'wellness', 'streetFood', 'nightlife', 'museums')
  const route = proposeRoutes(guide, 20, preferences, none)[1]
  const t = trip({ stages: toStages(guide, route, 'it') })
  const days = listDays(t.startDate, t.endDate)
  const result = planDays(guide, t, preferences, days, 'plan', 'it')
  assert.deepEqual(result.unknownCity, [])
  assert.ok(result.proposals.length >= 21)
  assert.equal(new Set(result.proposals.map((p) => p.place)).size, result.proposals.length)
  for (const proposal of result.proposals) {
    assert.ok(days.includes(proposal.date) && isWebUrl(proposal.source))
    assert.match(proposal.time, /^([01]\d|2[0-3]):[0-5]\d$|^$/)
  }
  for (const day of days) assert.ok(result.proposals.filter((p) => p.date === day).length <= 4, day)
  // Les activités créées passent la vérification des données.
  const activities = result.proposals.map((p, i) => ({ id: String(i), ...p }))
  assert.ok(parseData(JSON.stringify({ version: 1, trips: [{ ...t, activities }] })))
  // Une seconde création ne repropose pas ce qui est déjà au programme.
  const again = planDays(guide, { ...t, activities }, preferences, days, 'plan', 'it')
  assert.ok(again.proposals.every((p) => !activities.some((a) => a.title === p.title)))
})

test('les excursions ne sont pas des étapes, mais des journées', () => {
  for (const route of proposeRoutes(guide, 20, likes('temples', 'historic'), none)) {
    assert.ok(route.ids.every((id) => guide.destinations.find((d) => d.id === id)!.minNights > 0))
  }
  const t = trip({ endDate: '2027-04-06', stages: [{ city: 'Tokyo', nights: 5 }] })
  const days = listDays(t.startDate, t.endDate)
  const result = planDays(guide, t, likes('temples', 'historic', 'nightlife'), days, 'plan', 'it')
  assert.ok(result.proposals.some((p) => p.notes.startsWith('Gita da Tokyo')))
  const last = result.proposals.filter((p) => p.date === '2027-04-06')
  assert.ok(last.every((p) => p.time < '18:30'))
})

test('respecte les saisons, les fermetures et les journées normales', () => {
  const place = (id: string) => guide.places.find((p) => p.id === id)!
  assert.ok(!isAvailable(place('tokyo-miraikan'), '2027-04-10'))
  assert.ok(isAvailable(place('tokyo-miraikan'), '2027-05-10'))
  assert.ok(!isAvailable(place('nikko-yabusame-festival'), '2027-04-10'))
  assert.ok(!isAvailable(place('sapporo-niseko'), '2027-07-10'))
  // 3 avril 2027 : un samedi ; 5 avril : un lundi.
  assert.ok(!isAvailable(place('kyoto-yuzen-class'), '2027-04-03'))
  assert.ok(isAvailable(place('kyoto-yuzen-class'), '2027-04-05'))
  assert.ok(!isAvailable(place('takamatsu-chichu'), '2027-04-05'))
  const preferences = likes(...interests.map((i) => i.id))
  for (const pace of paces) {
    for (const startMonth of ['01', '04', '07', '10']) {
      const t = trip({ startDate: `2027-${startMonth}-01`, endDate: `2027-${startMonth}-21` })
      const route = proposeRoutes(guide, 20, { ...preferences, pace }, none)[2]
      const stages = toStages(guide, route, 'it')
      const result = planDays(guide, { ...t, stages }, { ...preferences, pace }, listDays(t.startDate, t.endDate), 'plan', 'it')
      for (const proposal of result.proposals) {
        const p = guide.places.find((c) => c.name === proposal.title)!
        assert.ok(isAvailable(p, proposal.date), `${p.id} ${proposal.date}`)
        assert.ok(!p.when?.someDays, p.id)
        if (p.slot !== 'evening') assert.ok(proposal.time < '17:00', `${p.id} ${proposal.time}`)
      }
    }
  }
})

test('crée un itinéraire en une fois, quelle que soit l’écriture de la destination', () => {
  const preferences = likes('temples', 'wellness')
  for (const destination of ['Giappone', 'Giapone', 'Jappone', 'giappone 2027', 'Japon', 'Japan', 'Tokio', 'Tokyo', 'Tokyo e Kyoto', 'Kioto']) {
    for (const endDate of ['2027-04-01', '2027-04-02', '2027-04-07', '2027-04-21']) {
      const t = trip({ destination, endDate })
      assert.ok(guideCovers(guide, t), destination)
      const route = automaticRoute(guide, t, preferences, 'it')
      const days = listDays(t.startDate, t.endDate)
      const result = planDays(guide, route ? { ...t, stages: route } : t, preferences, days, 'plan', 'it')
      assert.deepEqual(result.unknownCity, [], `${destination} ${endDate}`)
      assert.ok(result.proposals.length > 0, `${destination} ${endDate}`)
    }
  }
  const two = automaticRoute(guide, trip({ destination: 'Tokyo e Kioto' }), preferences, 'it')!
  assert.ok(['Tokyo', 'Kyoto'].every((city) => two.some((s) => s.city === city)))
  assert.equal(totalNights(two), 20)
  assert.equal(automaticRoute(guide, trip({ destination: 'Tokio' }), preferences, 'it'), null)
  assert.equal(automaticRoute(guide, trip({ stages: [{ city: 'Nara', nights: 20 }] }), preferences, 'it'), null)
})

test('complète les journées seulement si on le demande, et le signale', () => {
  const t = trip({ destination: 'Kyoto', endDate: '2027-04-07' })
  const preferences = likes('horses')
  const days = listDays(t.startDate, t.endDate)
  const strict = planDays(guide, t, preferences, days, 'plan', 'it')
  const filled = planDays(guide, t, preferences, days, 'plan', 'it', true)
  assert.ok(strict.proposals.every((p) => !p.notes.startsWith(extraText.it)))
  assert.ok(filled.proposals.length > strict.proposals.length)
  assert.ok(filled.empty.length < strict.empty.length)
  for (const proposal of filled.proposals) {
    const place = guide.places.find((p) => p.name === proposal.title)!
    assert.equal(!place.interests.includes('horses'), proposal.notes.startsWith(extraText.it), place.id)
    assert.ok(!place.when?.someDays)
  }
  assert.equal(new Set(filled.proposals.map((p) => p.title)).size, filled.proposals.length)
})

test('ne remplace que les activités créées par l’app et non modifiées', () => {
  const activity = (id: string, date: string, auto?: boolean) =>
    ({ id, date, time: '', title: id, place: '', notes: '', ...(auto ? { auto } : {}) })
  const t = trip({ activities: [activity('a', '2027-04-01', true), activity('b', '2027-04-01'), activity('c', '2027-04-02', true)] })
  const old = replaceable(t, ['2027-04-01'])
  assert.deepEqual(old.map((a) => a.id), ['a'])
  assert.deepEqual(without(t, old).activities.map((a) => a.id), ['b', 'c'])
  assert.ok(parseData(JSON.stringify({ version: 1, trips: [t] })))
  const bad = { ...t, activities: [{ ...activity('d', '2027-04-01'), auto: 'oui' }] }
  assert.equal(parseData(JSON.stringify({ version: 1, trips: [bad] })), null)
})

test('le mode « je choisis » donne plus d’idées, sans horaire', () => {
  const t = trip({ destination: 'Kyoto', endDate: '2027-04-02' })
  const preferences = likes('temples')
  const plan = planDays(guide, t, preferences, ['2027-04-01'], 'plan', 'fr')
  const pick = planDays(guide, t, preferences, ['2027-04-01'], 'pick', 'fr')
  assert.ok(pick.proposals.length > plan.proposals.length)
  assert.ok(pick.proposals.every((p) => p.time === ''))
})

test('dit quand il ne peut rien proposer', () => {
  const preferences = likes('temples')
  const country = planDays(guide, trip(), preferences, ['2027-04-01'], 'plan', 'it')
  assert.deepEqual(country.unknownCity, ['2027-04-01'])
  const unknown = trip({ stages: [{ city: 'Ville inconnue', nights: 20 }] })
  assert.equal(planDays(guide, unknown, preferences, ['2027-04-01'], 'plan', 'it').unknownCity.length, 1)
  assert.equal(findDestination(guide, 'Kyōto')?.id, 'kyoto')
  assert.equal(findDestination(guide, ''), undefined)
  assert.ok(guideCovers(guide, trip()) && guideCovers(guide, trip({ destination: 'Tokyo' })))
  assert.ok(!guideCovers(guide, trip({ destination: 'Francia' })))
})
