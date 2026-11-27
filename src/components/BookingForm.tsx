import { useState, type ChangeEvent, type FormEvent } from 'react'
import { putFiles } from '../fileStore'
import { findDates, rankDates, suggestDates, type FoundDate } from '../findDates'
import { formatDate, type Dictionary, type Language } from '../i18n'
import { readPdfText } from '../pdf'
import { bookingTypes, isDate, type Booking, type Trip } from '../trips'

type Props = {
  t: Dictionary
  language: Language
  trip: Trip
  booking: Booking
  isNew: boolean
  onSave: (booking: Booking) => void
  onCancel: () => void
}

const maxFileBytes = 15 * 1024 * 1024

type Reading =
  | { state: 'idle' | 'reading' | 'noText' | 'noDates' | 'unreadable' }
  | { state: 'found'; dates: FoundDate[] }

export default function BookingForm({ t, language, trip, booking, isNew, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState(booking)
  const [picked, setPicked] = useState<{ file: File; id: string } | null>(null)
  const [reading, setReading] = useState<Reading>({ state: 'idle' })
  const [suggested, setSuggested] = useState(false)
  const [error, setError] = useState<keyof Dictionary | null>(null)
  const [saving, setSaving] = useState(false)

  const hasEnd = draft.type === 'stay' || draft.type === 'flight' || draft.type === 'transport'
  const startLabel = draft.type === 'stay' ? t.checkInDate : hasEnd ? t.departureDate : t.bookingDate
  const endLabel = draft.type === 'stay' ? t.checkOutDate : t.arrivalDate

  function set<K extends keyof Booking>(key: K, value: Booking[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
    setError(null)
  }

  async function pick(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    if (file.size > maxFileBytes) return setError('pdfTooBig')
    // Un vrai PDF commence par « %PDF ».
    if (!(await file.slice(0, 1024).text()).includes('%PDF')) return setError('pdfInvalid')

    setError(null)
    setPicked({ file, id: crypto.randomUUID() })
    setDraft((current) => ({
      ...current,
      title: current.title || file.name.replace(/\.pdf$/i, ''),
    }))
    setReading({ state: 'reading' })
    try {
      const text = await readPdfText(file)
      const found = rankDates(findDates(text), trip.startDate, trip.endDate)
      if (!found.length) {
        return setReading({ state: text.trim() ? 'noDates' : 'noText' })
      }
      setReading({ state: 'found', dates: found })
      const [first, second] = suggestDates(found, trip.startDate, trip.endDate)
      // On ne remplace jamais une date déjà saisie.
      if (first) {
        setSuggested(true)
        setDraft((current) =>
          current.date
            ? current
            : { ...current, date: first, endDate: current.type === 'stay' ? (second ?? '') : '' },
        )
      }
    } catch {
      setReading({ state: 'unreadable' })
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!draft.title.trim()) return setError('nameRequired')
    if (!isDate(draft.date)) return setError('bookingDateRequired')
    if (draft.type === 'stay' && !draft.endDate) return setError('checkOutRequired')
    // Une heure d'arrivée sans date : le trajet finit le jour du départ.
    const endDate = hasEnd ? draft.endDate || (draft.endTime ? draft.date : '') : ''
    if (endDate && !isDate(endDate)) return setError('dateInvalid')
    // Un vol vers l'est peut arriver à une date antérieure : contrôle pour l'hébergement seulement.
    if (draft.type === 'stay' && endDate < draft.date) return setError('datesOrder')

    setSaving(true)
    let file = draft.file
    if (picked) {
      try {
        await putFiles([{ id: picked.id, bytes: await picked.file.arrayBuffer() }])
        file = { id: picked.id, name: picked.file.name }
      } catch {
        setSaving(false)
        return setError('pdfSaveFailed')
      }
    }
    onSave({
      ...draft,
      title: draft.title.trim(),
      notes: draft.notes.trim(),
      endDate,
      endTime: endDate ? draft.endTime : '',
      file,
    })
  }

  const outside = draft.date !== '' && (draft.date < trip.startDate || draft.date > trip.endDate)
  const fileName = picked?.file.name ?? draft.file?.name

  return (
    <form className="card" onSubmit={submit} noValidate>
      <h2>{isNew ? t.addBooking : t.editBooking}</h2>

      <label className="button file-button">
        {fileName ? t.replacePdf : t.attachPdf}
        <input type="file" accept="application/pdf,.pdf" onChange={pick} className="hidden-input" />
      </label>
      {fileName && <p className="muted">📄 {fileName}</p>}

      {reading.state === 'reading' && <p role="status">{t.pdfReading}</p>}
      {reading.state === 'noText' && <p role="status">{t.pdfNoText}</p>}
      {reading.state === 'noDates' && <p role="status">{t.pdfNoDates}</p>}
      {reading.state === 'unreadable' && <p role="status">{t.pdfUnreadable}</p>}

      <label>
        {t.bookingType}
        <select value={draft.type} onChange={(e) => set('type', e.target.value as Booking['type'])}>
          {bookingTypes.map((type) => (
            <option key={type} value={type}>
              {t[type]}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t.bookingName}
        <input value={draft.title} onChange={(e) => set('title', e.target.value)} />
      </label>

      {reading.state === 'found' && (
        <div className="found">
          <p>
            <strong>{t.datesFound}</strong>
          </p>
          <ul className="plain">
            {reading.dates.map((found) => (
              <li key={found.date}>
                <strong>{formatDate(found.date, language, true)}</strong>
                {(found.date < trip.startDate || found.date > trip.endDate) && (
                  <em> · {t.outsideTrip}</em>
                )}
                {found.ambiguous && <em> · {t.ambiguousDate}</em>}
                <p className="muted">«{found.excerpt}»</p>
                <div className="actions">
                  <button type="button" onClick={() => set('date', found.date)}>
                    {t.useAs} {startLabel}
                  </button>
                  {hasEnd && (
                    <button type="button" onClick={() => set('endDate', found.date)}>
                      {t.useAs} {endLabel}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {suggested && <p className="warning note">{t.checkSuggestion}</p>}

      <label>
        {startLabel}
        <input type="date" value={draft.date} onChange={(e) => set('date', e.target.value)} />
      </label>
      {outside && <p className="muted">{t.outsideTripHint}</p>}
      <label>
        {t.time}
        <input type="time" value={draft.time} onChange={(e) => set('time', e.target.value)} />
      </label>
      {hasEnd && (
        <>
          <label>
            {endLabel}
            <input type="date" value={draft.endDate} onChange={(e) => set('endDate', e.target.value)} />
          </label>
          <label>
            {t.endTimeLabel}
            <input type="time" value={draft.endTime} onChange={(e) => set('endTime', e.target.value)} />
          </label>
        </>
      )}
      <label>
        {t.notes}
        <textarea rows={3} value={draft.notes} onChange={(e) => set('notes', e.target.value)} />
      </label>

      {error && (
        <p className="error" role="alert">
          {t[error]}
        </p>
      )}
      <div className="actions">
        <button type="submit" className="primary" disabled={saving || reading.state === 'reading'}>
          {t.save}
        </button>
        <button type="button" onClick={onCancel} disabled={saving}>
          {t.cancel}
        </button>
      </div>
    </form>
  )
}
