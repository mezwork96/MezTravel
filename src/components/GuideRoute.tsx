import { useState } from 'react'
import type { Guide } from '../guide/types'
import type { Dictionary, Language } from '../i18n'
import type { Preferences } from '../interests'
import { link } from '../route'
import { findDestination, proposeRoutes, toStages, type PlannedRoute } from '../planner'
import type { Stage } from '../stages'
import StagesEditor from './StagesEditor'

type Props = {
  t: Dictionary
  language: Language
  guide: Guide
  preferences: Preferences
  days: string[]
  destination: string
  onSave: (stages: Stage[]) => void
}

const styleLabels = { few: 'styleFew', balanced: 'styleBalanced', many: 'styleMany' } as const

// Les questions posées par l'app, puis les parcours qu'elle calcule avec le guide.
export default function GuideRoute({
  t,
  language,
  guide,
  preferences,
  days,
  destination,
  onSave,
}: Props) {
  // Une ville écrite comme destination est déjà une ville voulue.
  const [include, setInclude] = useState<string[]>(() => {
    const city = findDestination(guide, destination)
    return city ? [city.id] : []
  })
  const [arrival, setArrival] = useState('')
  const [departure, setDeparture] = useState('')
  const [routes, setRoutes] = useState<PlannedRoute[] | null>(null)
  const [picked, setPicked] = useState<number | null>(null)

  const cities = [...guide.destinations].sort((a, b) => a.name.localeCompare(b.name, language))
  const name = (id: string) => guide.destinations.find((d) => d.id === id)!.name

  const change = (action: () => void) => {
    action()
    setRoutes(null)
    setPicked(null)
  }

  const citySelect = (label: string, value: string, set: (id: string) => void) => (
    <label>
      {label}
      <select value={value} onChange={(e) => change(() => set(e.target.value))}>
        <option value="">{t.notDecided}</option>
        {cities.map((city) => (
          <option key={city.id} value={city.id}>
            {city.name}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <>
      <h3>1. {t.questionIdea}</h3>
      <p className="muted">{t.questionIdeaNote}</p>
      <div className="chips" role="group" aria-label={t.questionIdea}>
        {cities.map((city) => (
          <button
            key={city.id}
            type="button"
            className="chip"
            aria-pressed={include.includes(city.id)}
            onClick={() =>
              change(() =>
                setInclude((current) =>
                  current.includes(city.id)
                    ? current.filter((id) => id !== city.id)
                    : [...current, city.id],
                ),
              )
            }
          >
            {city.name}
          </button>
        ))}
      </div>

      <h3>2. {t.questionAirports}</h3>
      {citySelect(t.arrivalCity, arrival, setArrival)}
      {citySelect(t.departureCity, departure, setDeparture)}

      <button
        type="button"
        className="primary wide"
        onClick={() => {
          setRoutes(
            proposeRoutes(guide, days.length - 1, preferences, { include, arrival, departure }),
          )
          setPicked(null)
        }}
      >
        ✨ {t.proposeRoute}
      </button>

      {routes && (
        <>
          <p className="card warning note">{t.routeRules}</p>
          {routes.map((route, index) => {
            const missing = [...include, arrival, departure].filter(
              (id) => id && !route.ids.includes(id),
            )
            return (
              <div key={route.ids.join()} className="route-option">
                <button
                  type="button"
                  className="chip wide"
                  aria-pressed={picked === index}
                  onClick={() => setPicked(index)}
                >
                  <strong>{t[styleLabels[route.style]]}</strong>
                  <span>{route.ids.map((id, i) => `${name(id)} (${route.nights[i]})`).join(' → ')}</span>
                </button>
                <p className="muted">
                  {t.travelTotal}: ~{Math.round(route.travelMinutes / 30) / 2} h
                </p>
                {missing.length > 0 && <p className="error">{t.tooManyCities}</p>}
                {picked === index && (
                  <StagesEditor
                    t={t}
                    language={language}
                    days={days}
                    initial={toStages(guide, route, language)}
                    saveLabel={t.useRoute}
                    onSave={onSave}
                  />
                )}
              </div>
            )
          })}
          <p>
            <a href={link('guide')}>📖 {t.guideTitle} ›</a>
          </p>
        </>
      )}
    </>
  )
}
