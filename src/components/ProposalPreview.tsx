import { formatDate, type Dictionary, type Language } from '../i18n'
import { alreadyPlanned, type Proposal } from '../proposals'
import type { Trip } from '../trips'
import SourceLink from './SourceLink'

export type Row = Proposal & { chosen: boolean }

type Props = {
  t: Dictionary
  language: Language
  trip: Trip
  days: string[]
  date?: string // jour imposé
  rows: Row[]
  onRows: (rows: Row[]) => void
  onAdd: () => void
}

export default function ProposalPreview({ t, language, trip, days, date, rows, onRows, onAdd }: Props) {
  const chosen = rows.filter((row) => row.chosen).length
  const dayName = (day: string) => `${t.day} ${days.indexOf(day) + 1} · ${formatDate(day, language)}`
  const setRow = (index: number, changes: Partial<Row>) =>
    onRows(rows.map((row, i) => (i === index ? { ...row, ...changes } : row)))

  return (
    <>
      <button
        type="button"
        className="wide"
        onClick={() => {
          const all = chosen < rows.length
          onRows(rows.map((row) => ({ ...row, chosen: all })))
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
                {!row.source && <span className="muted">{t.noSource}</span>}
                {alreadyPlanned(trip, row) && <em className="badge">{t.alreadyPlanned}</em>}
              </span>
            </label>
            <SourceLink t={t} url={row.source} />
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
      <button type="button" className="primary wide" disabled={chosen === 0} onClick={onAdd}>
        {t.addChosen} ({chosen})
      </button>
    </>
  )
}
