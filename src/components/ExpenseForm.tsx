import { useState, type FormEvent } from 'react'
import type { Dictionary, Language } from '../i18n'
import { allocate, amountToInput, convert, formatAmount, parseAmount, step } from '../money'
import { rateBetween, type Rates } from '../rates'
import { isDate, type Expense, type Member } from '../trips'
import { CurrencySelect, RatesSource } from './Money'

type Props = {
  t: Dictionary
  language: Language
  base: string
  members: Member[]
  rates: Rates | 'loading' | 'error'
  expense: Expense
  isNew: boolean
  onSave: (expense: Expense) => void
  onCancel: () => void
}

// Six chiffres significatifs suffisent pour un taux, même très petit.
const rateToText = (rate: number) => String(Number(rate.toPrecision(6)))
const parseRate = (text: string) => {
  const value = Number(text.trim().replace(',', '.'))
  return Number.isFinite(value) && value > 0 ? value : null
}

function sharedEqually(expense: Expense): boolean {
  const amounts = expense.shares.map((s) => s.amount)
  return Math.max(...amounts) - Math.min(...amounts) <= step(expense.currency)
}

export default function ExpenseForm(props: Props) {
  const { t, language, base, members, rates, expense, isNew, onSave, onCancel } = props
  const [title, setTitle] = useState(expense.title)
  const [date, setDate] = useState(expense.date)
  const [text, setText] = useState(isNew ? '' : amountToInput(expense.amount, expense.currency))
  const [currency, setCurrency] = useState(expense.currency)
  const [payerId, setPayerId] = useState(expense.payerId)
  const [equal, setEqual] = useState(isNew || sharedEqually(expense))
  const [included, setIncluded] = useState(
    () => new Set(isNew ? members.map((m) => m.id) : expense.shares.map((s) => s.memberId)),
  )
  const [custom, setCustom] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      isNew ? [] : expense.shares.map((s) => [s.memberId, amountToInput(s.amount, expense.currency)]),
    ),
  )
  // null : taux proposé automatiquement. Une dépense existante garde le sien.
  const [typedRate, setTypedRate] = useState<string | null>(isNew ? null : rateToText(expense.rate))
  const [keptRate, setKeptRate] = useState<number | null>(isNew ? null : expense.rate)
  const [error, setError] = useState<keyof Dictionary | null>(null)

  const automatic = typeof rates === 'object' ? rateBetween(rates, currency, base) : null
  const rate =
    currency === base ? 1 : (keptRate ?? (typedRate === null ? automatic : parseRate(typedRate)))
  const rateText = typedRate ?? (automatic === null ? '' : rateToText(automatic))
  const amount = parseAmount(text, currency)

  const chosen = members.filter((m) => included.has(m.id))
  const equalParts = allocate(amount ?? 0, chosen.map(() => 1), step(currency))
  const customParts = members.map((m) => {
    const value = (custom[m.id] ?? '').trim()
    return { memberId: m.id, amount: value ? parseAmount(value, currency) : 0 }
  })
  const customValid = customParts.every((p) => p.amount !== null)
  const remaining = (amount ?? 0) - customParts.reduce((sum, p) => sum + (p.amount ?? 0), 0)

  function changeCurrency(next: string) {
    setCurrency(next)
    // Retour à la monnaie d'origine : on retrouve le taux figé.
    const original = !isNew && next === expense.currency
    setKeptRate(original ? expense.rate : null)
    setTypedRate(original ? rateToText(expense.rate) : null)
    setError(null)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) return setError('expenseTitleRequired')
    if (!isDate(date)) return setError('bookingDateRequired')
    if (!amount) return setError('amountInvalid')
    if (rate === null) return setError('rateRequired')
    let shares: Expense['shares']
    if (equal) {
      if (chosen.length === 0) return setError('shareNobody')
      shares = chosen.map((m, i) => ({ memberId: m.id, amount: equalParts[i] }))
    } else {
      if (!customValid) return setError('amountInvalid')
      if (remaining !== 0) return setError('sharesMismatch')
      shares = customParts.map((p) => ({ memberId: p.memberId, amount: p.amount! }))
    }
    onSave({
      ...expense,
      title: title.trim(),
      date,
      amount,
      currency,
      rate,
      payerId,
      shares: shares.filter((s) => s.amount > 0),
    })
  }

  return (
    <form className="card" onSubmit={submit} onChange={() => setError(null)} noValidate>
      <h2>{isNew ? t.addExpense : t.editExpense}</h2>
      <label>
        {t.expenseTitle}
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label>
        {t.amount}
        <input inputMode="decimal" value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      {amount !== null && <p className="muted echo">= {formatAmount(amount, currency, language)}</p>}
      <label>
        {t.currency}
        <CurrencySelect language={language} rates={rates} value={currency} onChange={changeCurrency} />
      </label>

      {currency !== base && (
        <>
          <label>
            {t.rateUsed}: 1 {currency} = … {base}
            <input
              inputMode="decimal"
              value={rateText}
              onChange={(e) => {
                setKeptRate(null)
                setTypedRate(e.target.value)
              }}
            />
          </label>
          {amount !== null && rate !== null && (
            <p className="echo">
              <strong>≈ {formatAmount(convert(amount, rate, base), base, language)}</strong>
            </p>
          )}
          {typedRate === null && typeof rates === 'object' && automatic !== null && (
            <RatesSource t={t} language={language} rates={rates} />
          )}
          {typedRate === null && automatic === null && <p className="muted">{t.rateRequired}</p>}
        </>
      )}

      <label>
        {t.bookingDate}
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label>
        {t.paidBy}
        <select value={payerId} onChange={(e) => setPayerId(e.target.value)}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend>{t.splitBetween}</legend>
        <div className="actions segmented">
          <button type="button" aria-pressed={equal} onClick={() => setEqual(true)}>
            {t.splitEqual}
          </button>
          <button type="button" aria-pressed={!equal} onClick={() => setEqual(false)}>
            {t.splitCustom}
          </button>
        </div>
        {equal ? (
          <ul className="plain">
            {members.map((m) => (
              <li key={m.id} className="item">
                <label>
                  <input
                    type="checkbox"
                    checked={included.has(m.id)}
                    onChange={() => {
                      const next = new Set(included)
                      if (!next.delete(m.id)) next.add(m.id)
                      setIncluded(next)
                    }}
                  />
                  {m.name}
                </label>
                {included.has(m.id) && amount !== null && (
                  <span>
                    {formatAmount(equalParts[chosen.findIndex((c) => c.id === m.id)], currency, language)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <>
            {members.map((m) => (
              <label key={m.id}>
                {m.name}
                <input
                  inputMode="decimal"
                  value={custom[m.id] ?? ''}
                  onChange={(e) => setCustom({ ...custom, [m.id]: e.target.value })}
                />
              </label>
            ))}
            {amount !== null && customValid && (
              <p className={remaining === 0 ? 'success' : 'error'} role="status">
                {t.remaining}: {formatAmount(remaining, currency, language)}
              </p>
            )}
          </>
        )}
      </fieldset>

      {error && (
        <p className="error" role="alert">
          {t[error]}
        </p>
      )}
      <div className="actions">
        <button type="submit" className="primary">
          {t.save}
        </button>
        <button type="button" onClick={onCancel}>
          {t.cancel}
        </button>
      </div>
    </form>
  )
}
