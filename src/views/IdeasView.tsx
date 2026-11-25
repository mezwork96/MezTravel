import Proposals from '../components/Proposals'
import { formatDate, type Dictionary, type Language } from '../i18n'
import {
  clearInterests,
  defaultPreferences,
  interests,
  maxPeople,
  ownInterests,
  paces,
  toggleInterest,
  type Preferences,
} from '../interests'
import { requestDays } from '../proposals'
import { link } from '../route'
import { listDays, type Trip } from '../trips'

type Props = {
  t: Dictionary
  language: Language
  trip: Trip
  date?: string // jour choisi, sinon tout le voyage
  onChange: (change: (trip: Trip) => Trip) => void
}

const paceLabels = { calm: 'paceCalm', normal: 'paceNormal', intense: 'paceIntense' } as const

export default function IdeasView({ t, language, trip, date, onChange }: Props) {
  const days = listDays(trip.startDate, trip.endDate)
  const preferences = trip.preferences ?? defaultPreferences
  const chosen = date ? (ownInterests(preferences, date) ?? []) : preferences.interests

  // Chaque choix est enregistré tout de suite.
  const change = (next: (current: Preferences) => Preferences) =>
    onChange((current) => ({
      ...current,
      preferences: next(current.preferences ?? defaultPreferences),
    }))

  // Ce qui manque avant de pouvoir créer l'itinéraire.
  const missing = !trip.destination
    ? t.destinationMissing
    : requestDays(trip, preferences, date).length === 0
      ? t.needInterests
      : null

  const dayName = (day: string) => `${t.day} ${days.indexOf(day) + 1} · ${formatDate(day, language)}`

  return (
    <>
      <a className="back" href={date ? link(trip.id, date) : link(trip.id)}>
        ‹ {date ? formatDate(date, language) : trip.name}
      </a>
      <h2 className="page-title">{t.ideasTitle}</h2>
      <p className="muted">
        {trip.destination ? `${trip.destination} · ` : ''}
        {formatDate(trip.startDate, language)} → {formatDate(trip.endDate, language)}
      </p>
      {!trip.destination && <p className="card warning">{t.destinationMissing}</p>}
      {!date && days.length > 2 && !trip.stages?.length && (
        <a className="card row-link money-link" href={link(trip.id, 'route')}>
          <strong>🗺️ {t.routeFirst}</strong>
        </a>
      )}

      {/* Le bouton reste en bas de l'écran tant qu'on est dans les choix. */}
      <div>
      <section className="card">
        <h2>{t.peopleCount}</h2>
        <div className="stepper">
          <button
            type="button"
            aria-label={t.fewerPeople}
            disabled={preferences.people <= 1}
            onClick={() => change((p) => ({ ...p, people: p.people - 1 }))}
          >
            −
          </button>
          <strong aria-live="polite">{preferences.people}</strong>
          <button
            type="button"
            aria-label={t.morePeople}
            disabled={preferences.people >= maxPeople}
            onClick={() => change((p) => ({ ...p, people: p.people + 1 }))}
          >
            +
          </button>
        </div>

        <h2>{t.paceTitle}</h2>
        <div className="chips" role="group" aria-label={t.paceTitle}>
          {paces.map((pace) => (
            <button
              key={pace}
              type="button"
              className="chip"
              aria-pressed={preferences.pace === pace}
              onClick={() => change((p) => ({ ...p, pace }))}
            >
              {t[paceLabels[pace]]}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>{t.interestsTitle}</h2>
        <label>
          {t.interestsFor}
          <select
            value={date ?? ''}
            onChange={(e) => {
              const base = link(trip.id, 'ideas')
              window.location.replace(e.target.value ? `${base}/${e.target.value}` : base)
            }}
          >
            <option value="">{t.wholeTrip}</option>
            {days.map((day) => (
              <option key={day} value={day}>
                {ownInterests(preferences, day) ? '★ ' : ''}
                {dayName(day)}
              </option>
            ))}
          </select>
        </label>
        <p className="muted">{date ? t.dayInterestsNote : t.tripInterestsNote}</p>

        <div className="chips" role="group" aria-label={t.interestsTitle}>
          {interests.map((interest) => (
            <button
              key={interest.id}
              type="button"
              className="chip"
              aria-pressed={chosen.includes(interest.id)}
              onClick={() => change((p) => toggleInterest(p, interest.id, date))}
            >
              <span aria-hidden="true">{interest.icon}</span> {interest[language]}
            </button>
          ))}
        </div>

        <p role="status">
          {date && chosen.length === 0 ? t.dayUsesTrip : `${t.selectedCount}: ${chosen.length}`}
        </p>
        {chosen.length > 0 && (
          <button
            type="button"
            className="wide"
            onClick={() => change((p) => clearInterests(p, date))}
          >
            {date ? t.useTripInterests : t.clearInterests}
          </button>
        )}
      </section>

      <div className="create-bar">
        <button
          type="button"
          className="primary wide"
          disabled={missing !== null}
          onClick={() =>
            document.getElementById('proposals')?.scrollIntoView({ behavior: 'smooth' })
          }
        >
          {missing ?? `${t.goToCreate} ↓`}
        </button>
      </div>
      </div>

      <Proposals
        key={date ?? 'trip'}
        t={t}
        language={language}
        trip={trip}
        preferences={preferences}
        date={date}
        onChange={onChange}
      />
    </>
  )
}
