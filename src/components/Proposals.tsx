import { useState } from 'react'
import { readCache, writeCache } from '../cache'
import { formatDate, type Dictionary, type Language } from '../i18n'
import type { Preferences } from '../interests'
import {
  alreadyPlanned,
  buildRequest,
  modes,
  readProposals,
  requestDays,
  type Mode,
  type Proposal,
} from '../proposals'
import { link } from '../route'
import { listDays, type Trip } from '../trips'

type Props = {
  t: Dictionary
  language: Language
  trip: Trip
  preferences: Preferences
  date?: string
  onChange: (change: (trip: Trip) => Trip) => void
}

type Row = Proposal & { chosen: boolean }

const modeLabels = { plan: 'modePlan', pick: 'modePick' } as const

export default function Proposals({ t, language, trip, preferences, date, onChange }: Props) {
  const [mode, setMode] = useState<Mode>(() =>
    readCache<Mode>('meztravel.mode') === 'pick' ? 'pick' : 'plan',
  )
  const [copied, setCopied] = useState<boolean | null>(null)
  const [answer, setAnswer] = useState('')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [ignored, setIgnored] = useState(0)
  const [failed, setFailed] = useState(false)
  const [added, setAdded] = useState(0)

  const days = listDays(trip.startDate, trip.endDate)
  const wanted = requestDays(trip, preferences, date)
  const ready = trip.destination !== '' && wanted.length > 0
  const request = ready ? buildRequest(trip, preferences, mode, language, date) : ''
  const chosen = rows?.filter((row) => row.chosen).length ?? 0
  const dayName = (day: string) => `${t.day} ${days.indexOf(day) + 1} · ${formatDate(day, language)}`

  function choose(next: Mode) {
    setMode(next)
    writeCache('meztravel.mode', next)
    setCopied(null)
    setRows(null)
  }

  function read() {
    setAdded(0)
    // La réponse peut concerner n'importe quel jour du voyage affiché.
    const result = readProposals(answer, date ? [date] : days)
    setFailed(!result || result.proposals.length === 0)
    setIgnored(result?.ignored ?? 0)
    setRows(
      result && result.proposals.length > 0
        ? result.proposals.map((p) => ({ ...p, chosen: mode === 'plan' && !alreadyPlanned(trip, p) }))
        : null,
    )
  }

  const setRow = (index: number, changes: Partial<Row>) =>
    setRows((current) => current!.map((row, i) => (i === index ? { ...row, ...changes } : row)))

  function add() {
    const activities = rows!
      .filter((row) => row.chosen)
      .map(({ chosen: _, ...proposal }) => ({ id: crypto.randomUUID(), ...proposal }))
    onChange((current) => ({ ...current, activities: [...current.activities, ...activities] }))
    setAdded(activities.length)
    setRows(null)
    setAnswer('')
    setCopied(null)
  }

  return (
    <section className="card">
      <h2>{t.proposalsTitle}</h2>

      <div className="chips" role="group" aria-label={t.proposalsTitle}>
        {modes.map((option) => (
          <button
            key={option}
            type="button"
            className="chip"
            aria-pressed={mode === option}
            onClick={() => choose(option)}
          >
            {t[modeLabels[option]]}
          </button>
        ))}
      </div>
      <p className="muted">{mode === 'plan' ? t.modePlanNote : t.modePickNote}</p>

      {!ready && <p className="error">{trip.destination ? t.needInterests : t.destinationMissing}</p>}

      {ready && (
        <>
          {wanted.length > 10 && <p className="card warning note">{t.longRequest}</p>}

          <h3>1. {t.stepCopy}</h3>
          <button
            type="button"
            className="primary wide"
            onClick={() =>
              navigator.clipboard.writeText(request).then(
                () => setCopied(true),
                () => setCopied(false),
              )
            }
          >
            {copied ? `✓ ${t.copied}` : t.copyRequest}
          </button>
          {copied === false && <p className="error">{t.copyFailed}</p>}
          <details open={copied === false}>
            <summary>{t.showRequest}</summary>
            <textarea rows={10} readOnly value={request} aria-label={t.showRequest} />
          </details>

          <h3>2. {t.stepAsk}</h3>
          <p>{t.stepAskNote}</p>
          <p>
            <a href="https://claude.ai/new" target="_blank" rel="noreferrer">
              {t.openClaude}
            </a>
          </p>
        </>
      )}

      {trip.destination !== '' && (
        <>
          <h3>3. {t.stepPaste}</h3>
          <textarea
            rows={5}
            value={answer}
            aria-label={t.stepPaste}
            placeholder={t.pastePlaceholder}
            onChange={(e) => {
              setAnswer(e.target.value)
              setRows(null)
              setFailed(false)
              setAdded(0)
            }}
          />
          <button type="button" className="wide" disabled={!answer.trim()} onClick={read}>
            {t.readAnswer}
          </button>
          {failed && (
            <p className="error" role="alert">
              {t.answerUnreadable}
            </p>
          )}
        </>
      )}

      {rows && (
        <>
          <h3>{t.preview}</h3>
          <p className="card warning note">{t.proposalWarning}</p>
          {ignored > 0 && (
            <p className="muted">
              {t.ignoredCount}: {ignored}
            </p>
          )}
          <button
            type="button"
            className="wide"
            onClick={() => {
              const all = chosen < rows.length
              setRows(rows.map((row) => ({ ...row, chosen: all })))
            }}
          >
            {chosen < rows.length ? t.selectAll : t.selectNone}
          </button>
          <ul className="plain proposals">
            {rows.map((row, index) => (
              <li key={index}>
                <label>
                  <input
                    type="checkbox"
                    checked={row.chosen}
                    onChange={(e) => setRow(index, { chosen: e.target.checked })}
                  />
                  <span>
                    <strong>
                      {row.time && `${row.time} · `}
                      {row.title}
                    </strong>
                    {row.place && <span className="muted">{row.place}</span>}
                    {row.notes && <span className="notes">{row.notes}</span>}
                    {alreadyPlanned(trip, row) && <em className="badge">{t.alreadyPlanned}</em>}
                  </span>
                </label>
                {!date && (
                  <select
                    value={row.date}
                    aria-label={`${t.day}: ${row.title}`}
                    onChange={(e) => setRow(index, { date: e.target.value })}
                  >
                    {days.map((day) => (
                      <option key={day} value={day}>
                        {dayName(day)}
                      </option>
                    ))}
                  </select>
                )}
                {date && <span className="muted">{dayName(date)}</span>}
              </li>
            ))}
          </ul>
          <button type="button" className="primary wide" disabled={chosen === 0} onClick={add}>
            {t.addChosen} ({chosen})
          </button>
        </>
      )}

      {added > 0 && (
        <p role="status">
          ✓ {t.addedCount}: {added}.{' '}
          <a href={date ? link(trip.id, date) : link(trip.id)}>{t.seeProgram}</a>
        </p>
      )}
    </section>
  )
}
