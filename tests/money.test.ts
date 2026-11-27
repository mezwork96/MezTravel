import assert from 'node:assert/strict'
import { test } from 'node:test'
import { allocate, balances, convert, decimals, parseAmount, settle } from '../src/money.ts'
import { isFresh, parseRates, rateBetween } from '../src/rates.ts'
import { parseData, type Expense, type Trip } from '../src/trips.ts'

const sum = (list: number[]) => list.reduce((a, b) => a + b, 0)

test('connaît les décimales des monnaies', () => {
  assert.deepEqual(['EUR', 'CHF', 'JPY', 'KWD'].map(decimals), [2, 2, 0, 3])
})

test('comprend les montants tels qu’on les écrit', () => {
  const cases: [string, string, number | null][] = [
    ['12,50', 'EUR', 12500], ['12.5', 'CHF', 12500], ['0,05', 'EUR', 50], ['1000', 'JPY', 1_000_000],
    ['1.000', 'JPY', 1_000_000], ['1,000', 'EUR', 1_000_000], ['1 234,50', 'EUR', 1_234_500],
    ["1'234.50", 'CHF', 1_234_500], ['1.234,50', 'EUR', 1_234_500], ['1,234.50', 'USD', 1_234_500],
    ['1.000.000', 'JPY', 1_000_000_000], ['1.250', 'KWD', 1250],
    ['', 'EUR', null], ['abc', 'EUR', null], ['-5', 'EUR', null], ['12,505,0', 'EUR', null],
    ['12.5', 'JPY', null], ['1,23.45', 'EUR', null], ['1.2.3', 'EUR', null], ['12,3456', 'EUR', null],
  ]
  for (const [text, currency, expected] of cases) {
    assert.equal(parseAmount(text, currency), expected, `${text} ${currency}`)
  }
})

test('répartit sans perdre un centime', () => {
  assert.deepEqual(allocate(10_000, [1, 1, 1], 10), [3340, 3330, 3330])
  assert.deepEqual(allocate(1_000_000, [1, 1, 1], 1000), [334_000, 333_000, 333_000])
  assert.deepEqual(allocate(10, [0, 1, 1], 10), [0, 10, 0])
  assert.deepEqual(allocate(100, [], 10), [])
  for (let total = 0; total <= 3000; total += 70) {
    assert.equal(sum(allocate(total, [3, 7, 11, 1], 10)), total)
  }
})

test('arrondit les conversions à la plus petite pièce', () => {
  assert.equal(convert(1_000_000, 0.00537, 'CHF'), 5370)
  assert.equal(convert(10_000, 170.4567, 'JPY'), 1_705_000)
})

const expense = (id: string, amount: number, payerId: string, shares: [string, number][], rate = 1, currency = 'CHF'): Expense => ({
  id, date: '2027-04-01', title: id, amount, currency, rate, payerId,
  shares: shares.map(([memberId, value]) => ({ memberId, amount: value })),
})

const trip = (expenses: Expense[]): Trip => ({
  id: 't', name: 'n', destination: '', startDate: '2027-04-01', endDate: '2027-04-02',
  activities: [], items: [], updatedAt: 'x', currency: 'CHF',
  members: ['a', 'b', 'c'].map((id) => ({ id, name: id })), expenses,
})

test('calcule les soldes avec plusieurs monnaies et solde les comptes', () => {
  const t = trip([
    expense('cena', 90_000, 'a', [['a', 30_000], ['b', 30_000], ['c', 30_000]]),
    expense('treno', 10_000_000, 'b', [['a', 3_334_000], ['b', 3_333_000], ['c', 3_333_000]], 0.0057, 'JPY'),
  ])
  const totals = balances(t, 'CHF')
  assert.equal(sum([...totals.values()]), 0)
  assert.deepEqual([...totals.values()], [41_000, 8_000, -49_000])
  assert.deepEqual(settle(totals), [
    { from: 'c', to: 'a', amount: 41_000 },
    { from: 'c', to: 'b', amount: 8_000 },
  ])
})

test('après les remboursements, tout le monde est à jour', () => {
  const t = trip([expense('x', 10_000, 'a', [['a', 3340], ['b', 3330], ['c', 3330]])])
  const repayments = settle(balances(t, 'CHF')).map((r, i) => expense(`r${i}`, r.amount, r.from, [[r.to, r.amount]]))
  const done = balances(trip([...t.expenses!, ...repayments]), 'CHF')
  assert.deepEqual([...done.values()], [0, 0, 0])
  assert.deepEqual(settle(done), [])
})

test('les soldes restent à zéro au total dans des cas variés', () => {
  let seed = 7
  const random = (n: number) => (seed = (seed * 48271) % 2147483647) % n
  const expenses = Array.from({ length: 200 }, (_, i) => {
    const amount = (random(100_000) + 3) * 10
    const parts = allocate(amount, [random(5) + 1, random(5), random(5)], 10)
    return expense(`e${i}`, amount, 'abc'[random(3)], [['a', parts[0]], ['b', parts[1]], ['c', parts[2]]], (random(9000) + 1) / 1000, 'EUR')
  })
  const totals = balances(trip(expenses), 'CHF')
  assert.equal(sum([...totals.values()]), 0)
  assert.ok(settle(totals).length <= 2)
})

test('refuse des dépenses incohérentes et garde les anciennes données', () => {
  const read = (t: unknown) => parseData(JSON.stringify({ version: 1, trips: [t] }))
  const good = trip([expense('x', 100, 'a', [['b', 100]])])
  assert.ok(read(good))
  assert.ok(read({ ...good, currency: undefined, members: undefined, expenses: undefined }))
  assert.equal(read(trip([expense('x', 100, 'a', [['b', 90]])])), null)
  assert.equal(read(trip([expense('x', 100, 'z', [['b', 100]])])), null)
  assert.equal(read(trip([expense('x', 100, 'a', [['b', 100]], 0)])), null)
  assert.equal(read(trip([expense('x', 10.5, 'a', [['b', 10.5]])])), null)
  assert.equal(read({ ...good, currency: undefined }), null)
})

test('lit les taux et calcule les taux croisés', () => {
  const answer = {
    result: 'success', base_code: 'USD', time_last_update_unix: 1000, time_next_update_unix: 90_000,
    rates: { USD: 1, CHF: 0.8, JPY: 160, XXX: -1 },
  }
  const rates = parseRates(answer, 2_000_000)!
  assert.equal(rateBetween(rates, 'JPY', 'CHF'), 0.005)
  assert.equal(rateBetween(rates, 'EUR', 'CHF'), null)
  assert.equal(rateBetween(rates, 'EUR', 'EUR'), 1)
  assert.equal(rates.perUsd.XXX, undefined)
  assert.equal(parseRates({ result: 'error' }, 0), null)
  assert.ok(isFresh(rates, 80_000_000))
  assert.ok(!isFresh(rates, 100_000_000))
  assert.ok(isFresh({ ...rates, fetchedAt: 99_999_000 }, 100_000_000))
})

test('refuse un zéro de tête suivi de milliers', () => {
  assert.equal(parseAmount('0,500', 'CHF'), null)
  assert.equal(parseAmount('0.500', 'EUR'), null)
  assert.equal(parseAmount('0,50', 'EUR'), 500)
  assert.equal(parseAmount('0.500', 'KWD'), 500)
  assert.equal(parseAmount('1.000', 'EUR'), 1_000_000)
})
