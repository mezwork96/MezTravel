import { useState, type FormEvent } from 'react'
import { formatDate, type Dictionary, type Language } from '../i18n'
import type { Activity, Location } from '../trips'
import PlaceSearch from './PlaceSearch'

type Props = {
  t: Dictionary
  language: Language
  activity: Activity
  isNew: boolean
  days: string[]
  onSave: (activity: Activity) => void
  onCancel: () => void
}

export default function ActivityForm({ t, language, activity, isNew, days, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState(activity)
  const [missingTitle, setMissingTitle] = useState(false)

  const set = (key: 'time' | 'title' | 'place' | 'notes', value: string) =>
    setDraft((current) => ({
      ...current,
      [key]: value,
      // Si le texte du lieu change, l'ancien point sur la carte n'est plus fiable.
      ...(key === 'place' ? { location: undefined } : {}),
    }))

  const choose = (location: Location | undefined) =>
    setDraft((current) => ({
      ...current,
      location,
      place: current.place.trim() || !location ? current.place : location.label.split(',')[0],
    }))

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!draft.title.trim()) return setMissingTitle(true)
    onSave({ ...draft, title: draft.title.trim(), place: draft.place.trim(), notes: draft.notes.trim() })
  }

  return (
    <form className="inline-form" onSubmit={submit} noValidate>
      <h3>{isNew ? t.addActivity : t.editActivity}</h3>
      <label>
        {t.title}
        <input value={draft.title} onChange={(e) => set('title', e.target.value)} />
      </label>
      {!isNew && (
        <label>
          {t.moveToDay}
          <select
            value={draft.date}
            onChange={(e) => setDraft((current) => ({ ...current, date: e.target.value }))}
          >
            {days.map((day, index) => (
              <option key={day} value={day}>
                {t.day} {index + 1} · {formatDate(day, language)}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        {t.time}
        <input type="time" value={draft.time} onChange={(e) => set('time', e.target.value)} />
      </label>
      <label>
        {t.place}
        <input value={draft.place} onChange={(e) => set('place', e.target.value)} />
      </label>
      <PlaceSearch
        t={t}
        language={language}
        query={draft.place}
        location={draft.location}
        onChoose={choose}
      />
      <label>
        {t.notes}
        <textarea rows={3} value={draft.notes} onChange={(e) => set('notes', e.target.value)} />
      </label>
      {missingTitle && !draft.title.trim() && (
        <p className="error" role="alert">
          {t.titleRequired}
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
