import { useState } from 'react'
import Reminders from '../components/Reminders'
import TripForm from '../components/TripForm'
import { formatDate, type Dictionary, type Language } from '../i18n'
import { link } from '../route'
import { stageOn } from '../stages'
import {
  activitiesOn,
  bookingsOn,
  countOutside,
  diaryText,
  itemsOn,
  listDays,
  photosOn,
  today,
  type Trip,
  type TripDetails,
} from '../trips'

type Props = {
  t: Dictionary
  language: Language
  trip: Trip
  onChange: (change: (trip: Trip) => Trip) => void
  onDelete: () => void
}

export default function TripView({ t, language, trip, onChange, onDelete }: Props) {
  const [editing, setEditing] = useState(false)
  const now = today()
  const allDays = listDays(trip.startDate, trip.endDate)

  function save(details: TripDetails) {
    const hidden = countOutside(trip, details.startDate, details.endDate)
    const newlyHidden = hidden > countOutside(trip, trip.startDate, trip.endDate)
    if (newlyHidden && !window.confirm(`${t.confirmHide} ${hidden}`)) return
    onChange((current) => ({ ...current, ...details }))
    setEditing(false)
  }

  return (
    <>
      <a className="back" href={link()}>
        ‹ {t.myTrips}
      </a>

      {editing ? (
        <>
          <TripForm t={t} initial={trip} onSave={save} onCancel={() => setEditing(false)} />
          <button
            type="button"
            className="danger wide"
            onClick={() => window.confirm(t.confirmDeleteTrip) && onDelete()}
          >
            {t.deleteTrip}
          </button>
        </>
      ) : (
        <>
          <div className="title-row">
            <div>
              <h2 className="page-title">{trip.name}</h2>
              <p className="muted">{trip.destination}</p>
            </div>
            <button type="button" onClick={() => setEditing(true)}>
              {t.edit}
            </button>
          </div>

          <Reminders t={t} language={language} trips={[trip]} />

          <a className="card row-link money-link" href={link(trip.id, 'route')}>
            <strong>🗺️ {t.routeTitle}</strong>
            <span className="muted">
              {trip.stages?.length
                ? trip.stages.map((s) => `${s.city} (${s.nights})`).join(' → ')
                : t.routeEmpty}
            </span>
          </a>

          <a className="card row-link money-link" href={link(trip.id, 'ideas')}>
            <strong>✨ {t.ideasTitle}</strong>
            <span className="muted">
              {t.selectedCount}: {trip.preferences?.interests.length ?? 0}
            </span>
          </a>

          <a className="card row-link bookings-link" href={link(trip.id, 'bookings')}>
            <strong>📄 {t.bookingsTitle}</strong>
            <span className="muted">
              {t.bookingsCount}: {(trip.bookings ?? []).length} · {t.todosCount}:{' '}
              {(trip.todos ?? []).filter((todo) => !todo.done).length}
            </span>
          </a>

          <a className="card row-link money-link" href={link(trip.id, 'expenses')}>
            <strong>💶 {t.expensesTitle}</strong>
            <span className="muted">
              {t.members}: {(trip.members ?? []).length} · {t.expensesCount}:{' '}
              {(trip.expenses ?? []).filter((e) => !e.repayment).length}
            </span>
          </a>

          <a className="card row-link money-link" href={link(trip.id, 'emergency')}>
            <strong>🆘 {t.emergencyTitle}</strong>
          </a>

          {allDays.map((date, index) => {
            const activities = activitiesOn(trip, date)
            const booked = bookingsOn(trip, date)
            const missing = itemsOn(trip, date).filter((item) => !item.done).length
            return (
              <a key={date} className="card row-link" href={link(trip.id, date)}>
                <span className="muted">
                  {t.day} {index + 1}
                  {date === now && <em className="badge">{t.today}</em>}
                </span>
                <strong>{formatDate(date, language)}</strong>
                {stageOn(allDays, trip.stages ?? [], date) && (
                  <span>📍 {stageOn(allDays, trip.stages ?? [], date)!.stage.city}</span>
                )}
                {activities.length > 0 && (
                  <span>{activities.map((a) => a.title).join(' · ')}</span>
                )}
                {booked.length > 0 && (
                  <span>📄 {booked.map((b) => b.booking.title).join(' · ')}</span>
                )}
                {(diaryText(trip, date) || photosOn(trip, date).length > 0) && (
                  <span className="muted">
                    📔 {t.diaryTitle}
                    {photosOn(trip, date).length > 0 && ` · 📷 ${photosOn(trip, date).length}`}
                  </span>
                )}
                {(activities.length > 0 || missing > 0) && (
                  <span className="muted">
                    {t.activitiesCount}: {activities.length}
                    {missing > 0 && ` · ${t.toBringCount}: ${missing}`}
                  </span>
                )}
              </a>
            )
          })}
        </>
      )}
    </>
  )
}
