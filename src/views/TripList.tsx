import { useState } from 'react'
import Backup from '../components/Backup'
import Reminders from '../components/Reminders'
import TripForm from '../components/TripForm'
import { formatDate, type Dictionary, type Language } from '../i18n'
import { link } from '../route'
import type { Update } from '../store'
import type { Data, TripDetails } from '../trips'

type Props = { t: Dictionary; language: Language; data: Data; update: Update }

export default function TripList({ t, language, data, update }: Props) {
  const [creating, setCreating] = useState(false)
  const trips = [...data.trips].sort((a, b) => a.startDate.localeCompare(b.startDate))
  const installed = window.matchMedia('(display-mode: standalone)').matches

  function create(details: TripDetails) {
    const id = crypto.randomUUID()
    const trip = { ...details, id, activities: [], items: [], updatedAt: new Date().toISOString() }
    update((current) => ({ ...current, trips: [...current.trips, trip] }))
    window.location.hash = link(id)
  }

  return (
    <>
      {creating ? (
        <TripForm t={t} onSave={create} onCancel={() => setCreating(false)} />
      ) : (
        <section>
          <Reminders t={t} language={language} trips={trips} />
          <h2 className="page-title">{t.myTrips}</h2>
          {trips.length === 0 && <p className="card">{t.noTrips}</p>}
          {trips.map((trip) => (
            <a key={trip.id} className="card row-link" href={link(trip.id)}>
              <strong>{trip.name}</strong>
              {trip.destination && <span>{trip.destination}</span>}
              <span className="muted">
                {formatDate(trip.startDate, language, true)} → {formatDate(trip.endDate, language, true)}
              </span>
            </a>
          ))}
          <button type="button" className="primary wide" onClick={() => setCreating(true)}>
            + {t.newTrip}
          </button>
        </section>
      )}

      <a className="card row-link money-link" href={link('guide')}>
        <strong>📖 {t.guideTitle}</strong>
      </a>

      <a className="card row-link money-link" href={link('convert')}>
        <strong>💱 {t.converter}</strong>
      </a>

      <a className="card row-link money-link" href={link('translate')}>
        <strong>🈂️ {t.translator}</strong>
      </a>

      <a className="card row-link money-link" href={link('emergency')}>
        <strong>🆘 {t.emergencyTitle}</strong>
      </a>

      <Backup t={t} data={data} update={update} />

      {!installed && (
        <section className="card">
          <h2>{t.installTitle}</h2>
          <p>{t.installText}</p>
        </section>
      )}
    </>
  )
}
