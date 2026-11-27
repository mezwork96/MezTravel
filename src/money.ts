// Calculs d'argent, sans écran. Les montants sont des entiers en millièmes
// (12,50 = 12500) : pas d'erreurs d'arrondi des nombres à virgule, et la même
// valeur sur tous les appareils, quelle que soit la monnaie.
import type { Expense, Trip } from './trips.ts'

export const scale = 1000
const maxAmount = 1_000_000_000_000 // mille milliards d'unités

// Nombre de décimales d'usage : 2 pour l'euro, 0 pour le yen, 3 pour le dinar koweïtien.
export function decimals(currency: string): number {
  try {
    const options = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
    return Math.min(3, options.maximumFractionDigits ?? 2)
  } catch {
    return 2
  }
}

// Plus petite pièce, en millièmes.
export const step = (currency: string) => scale / 10 ** decimals(currency)

const roundTo = (value: number, unit: number) => Math.round(value / unit) * unit

// Accepte « 12,50 », « 12.50 », « 1 000 », « 1'000 », « 1.234,50 ».
// Un seul séparateur suivi de trois chiffres désigne les milliers (« 1.000 » = mille),
// sauf pour les monnaies à trois décimales. null = saisie incompréhensible.
export function parseAmount(input: string, currency: string): number | null {
  const text = input.replace(/[\s'’]/g, '')
  if (!/^\d[\d.,]*$/.test(text)) return null
  const separators = text.replace(/\d/g, '')
  let whole = text
  let fraction = ''
  if (separators) {
    const last = Math.max(text.lastIndexOf('.'), text.lastIndexOf(','))
    const mark = text[last]
    const after = text.slice(last + 1)
    const repeated = separators.split(mark).length - 1 > 1
    const mixed = separators.includes(mark === '.' ? ',' : '.')
    const thousands = !mixed && (repeated || (after.length === 3 && decimals(currency) < 3))
    // « 0,500 » : personne n'écrit un millier avec un zéro devant, la saisie est douteuse.
    if (thousands && text.startsWith('0')) return null
    if (!thousands) {
      if (repeated || after.length > decimals(currency)) return null
      whole = text.slice(0, last)
      fraction = after
    }
    // Les groupes de milliers doivent compter trois chiffres et un seul signe.
    if (/[.,]/.test(whole)) {
      if (!/^\d{1,3}(([.])\d{3})(\2\d{3})*$|^\d{1,3}((,)\d{3})(\4\d{3})*$/.test(whole)) return null
      whole = whole.replace(/[.,]/g, '')
    }
  }
  const value = Number(whole) * scale + Number(fraction.padEnd(3, '0') || 0)
  return value <= maxAmount * scale ? value : null
}

export function formatAmount(amount: number, currency: string, language: string): string {
  const digits = decimals(currency)
  const number = new Intl.NumberFormat(language, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount / scale)
  return `${number} ${currency}`
}

// Texte à remettre dans un champ de saisie.
export function amountToInput(amount: number, currency: string): string {
  return (amount / scale).toFixed(decimals(currency))
}

// Répartit un total selon des poids, à la plus petite pièce près ; la somme est exacte.
// Les pièces restantes vont aux plus grands restes, puis dans l'ordre de la liste.
export function allocate(total: number, weights: number[], unit: number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0)
  if (sum <= 0) return weights.map(() => 0)
  const units = Math.round(total / unit)
  const exact = weights.map((w) => (units * w) / sum)
  const parts = exact.map(Math.floor)
  const order = exact
    .map((value, i) => ({ i, rest: value - parts[i] }))
    .filter(({ i }) => weights[i] > 0)
    .sort((a, b) => b.rest - a.rest || a.i - b.i)
  let left = units - parts.reduce((a, b) => a + b, 0)
  for (let k = 0; left > 0; k++, left--) parts[order[k % order.length].i]++
  return parts.map((p) => p * unit)
}

export const convert = (amount: number, rate: number, to: string) => roundTo(amount * rate, step(to))

// Montant total d'une dépense dans la monnaie des comptes du voyage.
export const inBase = (expense: Expense, base: string) => convert(expense.amount, expense.rate, base)

// Solde de chaque personne : positif = on lui doit de l'argent. La somme vaut zéro.
export function balances(trip: Trip, base: string): Map<string, number> {
  const result = new Map((trip.members ?? []).map((m) => [m.id, 0]))
  const add = (id: string, value: number) => result.set(id, (result.get(id) ?? 0) + value)
  for (const expense of trip.expenses ?? []) {
    const total = inBase(expense, base)
    const parts = allocate(total, expense.shares.map((s) => s.amount), step(base))
    add(expense.payerId, total)
    expense.shares.forEach((share, i) => add(share.memberId, -parts[i]))
  }
  return result
}

export type Transfer = { from: string; to: string; amount: number }

// Le plus gros débiteur rembourse le plus gros créancier : au plus un virement
// de moins que le nombre de personnes.
export function settle(totals: Map<string, number>): Transfer[] {
  const open = [...totals].map(([id, value]) => ({ id, value })).filter((p) => p.value !== 0)
  const transfers: Transfer[] = []
  for (;;) {
    open.sort((a, b) => b.value - a.value)
    const creditor = open[0]
    const debtor = open[open.length - 1]
    if (!creditor || creditor.value <= 0 || debtor.value >= 0) return transfers
    const amount = Math.min(creditor.value, -debtor.value)
    transfers.push({ from: debtor.id, to: creditor.id, amount })
    creditor.value -= amount
    debtor.value += amount
  }
}
