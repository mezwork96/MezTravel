import { useState, type FormEvent } from 'react'
import ActivityForm from '../components/ActivityForm'
import BookingCard, { bookingLabel } from '../components/BookingCard'
import PdfViewer from '../components/PdfViewer'
import DayMap from '../components/DayMap'
import Nearby from '../components/Nearby'
import Diary from '../components/Diary'
import DayWeather from '../components/DayWeather'
import { formatDate, type Dictionary, type Language } from '../i18n'
import { ownInterests } from '../interests'
import { link } from '../route'
import SourceLink from '../components/SourceLink'
import { stageOn } from '../stages'
import { activitiesOn, bookingsOn, itemsOn, listDays, upsert, type Activity, type Trip } from '../trips'

type Props = {
  t: Dictionary
  language: Language
  trip: Trip
  date: string
  onChange: (change: (trip: Trip) => Trip) => void
}

export default function DayView({ t, language, trip, date, onChange }: Props) {
  const [draft, setDraft] = useState<Activity | null>(null)
  const [itemText, setItemText] = useState('')
  const [viewing, setViewing] = useState<{ id: string; name: string } | null>(null)

  const days = listDays(trip.startDate, trip.endDate)
  const index = days.indexOf(date)
  const activities = activitiesOn(trip, date)
  const items = itemsOn(trip, date)
  // Les étapes situées sont numérotées de la même façon dans la liste et sur la carte.
  const stops = activities.filter((a) => a.location)
  const here = stageOn(days, trip.stages ?? [], date)
  const city = here?.stage.city ?? trip.destination
  const around = [
    ...new Set(
      [
        here?.stage.area ? `${here.stage.area}, ${city}` : '',
        city,
        // « Nom du lieu, ville » : sans la ville, la recherche peut se tromper d'endroit.
        ...activities
          .map((a) => a.place || a.title)
          .map((name) => (city && !name.includes(city) ? `${name}, ${city}` : name)),
      ].filter(Boolean),
    ),
  ]
  const isNew = draft !== null && !activities.some((a) => a.id === draft.id)

  function saveActivity(activity: Activity) {
    onChange((current) => ({ ...current, activities: upsert(current.activities, activity) }))
    setDraft(null)
  }

  function removeActivity(id: string) {
    if (!window.confirm(t.confirmDeleteActivity)) return
    onChange((current) => ({ ...current, activities: current.activities.filter((a) => a.id !== id) }))
  }

  function addItem(event: FormEvent) {
    event.preventDefault()
    const text = itemText.trim()
    if (!text) return
    const item = { id: crypto.randomUUID(), date, text, done: false }
    onChange((current) => ({ ...current, items: [...current.items, item] }))
    setItemText('')
  }

  const form = draft && (
    <ActivityForm
      key={draft.id}
      t={t}
      language={language}
      activity={draft}
      isNew={isNew}
      days={days}
      onSave={saveActivity}
      onCancel={() => setDraft(null)}
    />
  )

  return (
    <>
      <a className="back" href={link(trip.id)}>
        ‹ {trip.name}
      </a>

      <p className="muted">
        {t.day} {index + 1} / {days.length}
      </p>
      <h2 className="page-title">{formatDate(date, language, true)}</h2>

      {here && (
        <p>
          📍 <strong>{here.stage.city}</strong>
          {here.from && ` · ${t.arrivingFrom} ${here.from}`}
        </p>
      )}
      {here?.from && here.stage.transfer && <p className="muted">🚆 {here.stage.transfer}</p>}

      <DayWeather t={t} language={language} date={date} stop={stops[0]} />

      {bookingsOn(trip, date).map(({ booking, role }) => (
        <div key={`${booking.id}-${role}`}>
          <h3 className="booking-role">{bookingLabel(t, booking, role)}</h3>
          <BookingCard t={t} language={language} booking={booking} onOpenPdf={setViewing} />
        </div>
      ))}

      <a className="card row-link money-link" href={`${link(trip.id, 'ideas')}/${date}`}>
        <strong>✨ {t.ideasForDay}</strong>
        {trip.preferences && ownInterests(trip.preferences, date) && (
          <span className="muted">
            {t.selectedCount}: {ownInterests(trip.preferences, date)!.length}
          </span>
        )}
      </a>

      <section className="card">
        <h2>{t.activities}</h2>
        {activities.length === 0 && !draft && <p>{t.noActivities}</p>}
        <ul className="plain">
          {activities.map((activity) =>
            draft?.id === activity.id ? (
              <li key={activity.id}>{form}</li>
            ) : (
              <li key={activity.id} className="activity">
                <span className="time">{activity.time || '—'}</span>
                <div>
                  {activity.location && (
                    <span className="stop-number">{stops.indexOf(activity) + 1}</span>
                  )}
                  <strong>{activity.title}</strong>
                  {activity.place && <p className="muted">{activity.place}</p>}
                  {activity.notes && <p className="notes">{activity.notes}</p>}
                  <SourceLink t={t} url={activity.source} />
                  <div className="actions">
                    <button type="button" onClick={() => setDraft(activity)}>
                      {t.edit}
                    </button>
                    <button type="button" onClick={() => removeActivity(activity.id)}>
                      {t.remove}
                    </button>
                  </div>
                </div>
              </li>
            ),
          )}
        </ul>
        {isNew && form}
        {!draft && (
          <button
            type="button"
            className="primary wide"
            onClick={() =>
              setDraft({ id: crypto.randomUUID(), date, time: '', title: '', place: '', notes: '' })
            }
          >
            + {t.addActivity}
          </button>
        )}
      </section>

      <DayMap t={t} stops={stops} />

      <details className="card">
        <summary>
          🔎 <strong>{t.nearbyTitle}</strong>
        </summary>
        <Nearby key={city} t={t} language={language} places={around} />
      </details>

      <section className="card">
        <h2>{t.toBring}</h2>
        {items.length === 0 && <p>{t.noItems}</p>}
        <ul className="plain">
          {items.map((item) => (
            <li key={item.id} className="item">
              <label className={item.done ? 'done' : undefined}>
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() =>
                    onChange((current) => ({
                      ...current,
                      items: upsert(current.items, { ...item, done: !item.done }),
                    }))
                  }
                />
                {item.text}
              </label>
              <button
                type="button"
                aria-label={`${t.remove}: ${item.text}`}
                onClick={() =>
                  onChange((current) => ({
                    ...current,
                    items: current.items.filter((i) => i.id !== item.id),
                  }))
                }
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <form className="add-row" onSubmit={addItem}>
          <input
            value={itemText}
            placeholder={t.toBringPlaceholder}
            aria-label={t.toBring}
            onChange={(e) => setItemText(e.target.value)}
          />
          <button type="submit" className="primary">
            {t.add}
          </button>
        </form>
      </section>

      <Diary t={t} trip={trip} date={date} onChange={onChange} />

      <a className="back" href={link(trip.id, 'bookings')}>
        {t.bookingsTitle} ›
      </a>

      {viewing && <PdfViewer t={t} file={viewing} onClose={() => setViewing(null)} />}

      <nav className="day-nav">
        {index > 0 ? <a className="button" href={link(trip.id, days[index - 1])}>‹ {t.previousDay}</a> : <span />}
        {index < days.length - 1 && (
          <a className="button" href={link(trip.id, days[index + 1])}>
            {t.nextDay} ›
          </a>
        )}
      </nav>
    </>
  )
}
