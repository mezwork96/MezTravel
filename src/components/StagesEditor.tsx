import { useState } from 'react'
import type { Dictionary, Language } from '../i18n'
import { formatDate } from '../i18n'
import { maxStages, stageDays, totalNights, type Stage } from '../stages'
import SourceLink from './SourceLink'

type Props = {
  t: Dictionary
  language: Language
  days: string[]
  initial: Stage[]
  saveLabel: string
  onSave: (stages: Stage[]) => void
}

// Les étapes se modifient librement ; on ne peut les enregistrer que si le total
// des nuits correspond aux dates du voyage.
export default function StagesEditor({ t, language, days, initial, saveLabel, onSave }: Props) {
  const [rows, setRows] = useState(() => initial.map((stage) => ({ key: crypto.randomUUID(), stage })))
  const [city, setCity] = useState('')

  const stages = rows.map((row) => row.stage)
  const nights = days.length - 1
  const difference = nights - totalNights(stages)
  const placed = stageDays(days, stages)

  const change = (index: number, changes: Partial<Stage>) =>
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, stage: { ...row.stage, ...changes } } : row)),
    )

  function moveUp(index: number) {
    setRows((current) => {
      const next = [...current]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      // L'explication du trajet ne vaut plus après un changement d'ordre.
      return next.map((row) => ({ ...row, stage: { ...row.stage, transfer: undefined } }))
    })
  }

  function addCity() {
    const name = city.trim()
    if (!name || rows.length >= maxStages) return
    setRows((current) => [...current, { key: crypto.randomUUID(), stage: { city: name, nights: 1 } }])
    setCity('')
  }

  return (
    <>
      <ol className="plain stages">
        {rows.map(({ key, stage }, index) => {
          const own = placed[index].days
          return (
            <li key={key}>
              <strong>
                {index + 1}. {stage.city}
              </strong>
              {own.length > 0 && (
                <p className="muted">
                  {formatDate(own[0], language)} → {formatDate(own[own.length - 1], language)}
                </p>
              )}
              {stage.why && <p className="notes">{stage.why}</p>}
              {stage.transfer && <p className="muted">🚆 {stage.transfer}</p>}
              <SourceLink t={t} url={stage.source} />
              <div className="stepper">
                <button
                  type="button"
                  aria-label={`${t.fewerNights}: ${stage.city}`}
                  disabled={stage.nights <= 1}
                  onClick={() => change(index, { nights: stage.nights - 1 })}
                >
                  −
                </button>
                <span>
                  {t.nights}: <strong>{stage.nights}</strong>
                </span>
                <button
                  type="button"
                  aria-label={`${t.moreNights}: ${stage.city}`}
                  disabled={stage.nights >= nights}
                  onClick={() => change(index, { nights: stage.nights + 1 })}
                >
                  +
                </button>
              </div>
              <label>
                {t.sleepArea}
                <input
                  value={stage.area ?? ''}
                  maxLength={100}
                  onChange={(e) => change(index, { area: e.target.value || undefined })}
                />
              </label>
              <div className="actions">
                {index > 0 && (
                  <button type="button" onClick={() => moveUp(index)}>
                    ↑ {t.moveUp}
                  </button>
                )}
                <button type="button" onClick={() => setRows(rows.filter((row) => row.key !== key))}>
                  {t.remove}
                </button>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="add-row">
        <input
          value={city}
          maxLength={100}
          placeholder={t.addCity}
          aria-label={t.addCity}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCity()}
        />
        <button type="button" onClick={addCity}>
          {t.add}
        </button>
      </div>

      <p className={difference === 0 ? undefined : 'error'} role="status">
        {t.nightsTotal}: {totalNights(stages)} / {nights}
        {difference > 0 && ` · ${t.nightsMissing}: ${difference}`}
        {difference < 0 && ` · ${t.nightsExtra}: ${-difference}`}
        {difference === 0 && ' ✓'}
      </p>
      <button
        type="button"
        className="primary wide"
        disabled={rows.length === 0 || difference !== 0}
        onClick={() => onSave(stages)}
      >
        {saveLabel}
      </button>
    </>
  )
}
