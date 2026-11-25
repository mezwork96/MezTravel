import { useState } from 'react'
import ClaudeSteps from '../components/ClaudeSteps'
import StagesEditor from '../components/StagesEditor'
import { formatDate, type Dictionary, type Language } from '../i18n'
import { defaultPreferences } from '../interests'
import { link } from '../route'
import {
  buildRouteRequest,
  emptyWishes,
  readRoutes,
  totalNights,
  type ProposedRoute,
  type RouteWishes,
  type Stage,
} from '../stages'
import { listDays, type Trip } from '../trips'

type Props = {
  t: Dictionary
  language: Language
  trip: Trip
  onChange: (change: (trip: Trip) => Trip) => void
}

const wishFields = [
  ['arrival', 'arrivalCity'],
  ['departure', 'departureCity'],
  ['mustSee', 'mustSee'],
] as const

export default function RouteView({ t, language, trip, onChange }: Props) {
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<{ routes: ProposedRoute[]; searched: boolean } | null>(null)
  const [failed, setFailed] = useState(false)
  const [picked, setPicked] = useState<number | null>(null)
  // Change après chaque enregistrement pour repartir du parcours enregistré.
  const [version, setVersion] = useState(0)
  const [saved, setSaved] = useState(false)

  const days = listDays(trip.startDate, trip.endDate)
  const nights = days.length - 1
  const preferences = trip.preferences ?? defaultPreferences
  const wishes = trip.routeWishes ?? emptyWishes
  const stages = trip.stages ?? []
  const chosenInterests =
    preferences.interests.length + preferences.days.reduce((sum, d) => sum + d.interests.length, 0)
  const request =
    trip.destination && nights > 0
      ? buildRouteRequest(trip, nights, preferences, wishes, language)
      : ''

  const setWish = (key: keyof RouteWishes, value: string) =>
    onChange((current) => ({
      ...current,
      routeWishes: { ...(current.routeWishes ?? emptyWishes), [key]: value },
    }))

  function save(next: Stage[]) {
    if (stages.length > 0 && picked !== null && !window.confirm(t.confirmReplaceRoute)) return
    onChange((current) => ({ ...current, stages: next }))
    setResult(null)
    setPicked(null)
    setAnswer('')
    setVersion((v) => v + 1)
    setSaved(true)
    window.scrollTo(0, 0)
  }

  function read() {
    const found = readRoutes(answer)
    setResult(found)
    setFailed(found === null)
    setPicked(null)
  }

  return (
    <>
      <a className="back" href={link(trip.id)}>
        ‹ {trip.name}
      </a>
      <h2 className="page-title">{t.routeTitle}</h2>
      <p className="muted">
        {trip.destination ? `${trip.destination} · ` : ''}
        {formatDate(trip.startDate, language)} → {formatDate(trip.endDate, language)} · {t.days}:{' '}
        {days.length} · {t.nights}: {nights}
      </p>

      {!trip.destination && <p className="card warning">{t.destinationMissing}</p>}
      {nights === 0 && <p className="card">{t.routeTooShort}</p>}

      {saved && (
        <p className="card" role="status">
          ✓ {t.routeSaved}{' '}
          <a href={link(trip.id, 'ideas')}>{t.routeNextStep} ›</a>
        </p>
      )}

      {nights > 0 && stages.length > 0 && (
        <section className="card">
          <h2>{t.myRoute}</h2>
          {totalNights(stages) !== nights && <p className="error">{t.routeMismatch}</p>}
          <StagesEditor
            key={version}
            t={t}
            language={language}
            days={days}
            initial={stages}
            saveLabel={t.saveRoute}
            onSave={save}
          />
          <button
            type="button"
            className="wide"
            onClick={() => {
              if (!window.confirm(t.confirmDeleteRoute)) return
              onChange((current) => ({ ...current, stages: undefined }))
              setSaved(false)
            }}
          >
            {t.deleteRoute}
          </button>
        </section>
      )}

      {nights > 0 && (
        <section className="card">
          <h2>{t.askRoute}</h2>
          <p>{t.askRouteNote}</p>
          <p>
            <a href={link(trip.id, 'ideas')}>
              ✨ {t.interestsTitle} ({chosenInterests}) ›
            </a>
          </p>
          {chosenInterests === 0 && <p className="card warning note">{t.routeNoInterests}</p>}

          {wishFields.map(([key, label]) => (
            <label key={key}>
              {t[label]}
              <input
                value={wishes[key]}
                maxLength={200}
                onChange={(e) => setWish(key, e.target.value)}
              />
            </label>
          ))}

          <ClaudeSteps
            t={t}
            request={request}
            sentNote={t.routeSent}
            answer={answer}
            failed={failed}
            onAnswer={(value) => {
              setAnswer(value)
              setResult(null)
              setFailed(false)
              setPicked(null)
              setSaved(false)
            }}
            onRead={read}
          />

          {result && (
            <>
              <h3>{t.preview}</h3>
              <p className="card warning note">{t.proposalWarning}</p>
              {!result.searched && <p className="error">{t.noWebSearch}</p>}
              {result.routes.map((route, index) => (
                <div key={index} className="route-option">
                  <button
                    type="button"
                    className="chip wide"
                    aria-pressed={picked === index}
                    onClick={() => setPicked(index)}
                  >
                    <strong>{route.name || `${t.routeOption} ${index + 1}`}</strong>
                    <span>{route.stages.map((s) => `${s.city} (${s.nights})`).join(' → ')}</span>
                  </button>
                  {route.summary && <p className="notes">{route.summary}</p>}
                  {picked === index && (
                    <StagesEditor
                      t={t}
                      language={language}
                      days={days}
                      initial={route.stages}
                      saveLabel={t.useRoute}
                      onSave={save}
                    />
                  )}
                </div>
              ))}
            </>
          )}
        </section>
      )}

      {nights > 0 && stages.length === 0 && picked === null && (
        <details className="card">
          <summary>{t.routeByHand}</summary>
          <StagesEditor
            key={version}
            t={t}
            language={language}
            days={days}
            initial={[]}
            saveLabel={t.saveRoute}
            onSave={save}
          />
        </details>
      )}
    </>
  )
}
