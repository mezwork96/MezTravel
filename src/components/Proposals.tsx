import { useEffect, useRef, useState } from 'react'
import { readCache, writeCache } from '../cache'
import { useGuide } from '../guide/useGuide'
import type { Dictionary, Language } from '../i18n'
import type { Preferences } from '../interests'
import { automaticRoute, guideCovers, planDays } from '../planner'
import {
  alreadyPlanned,
  buildRequest,
  modes,
  readProposals,
  requestDays,
  type Mode,
  type Proposal,
} from '../proposals'
import { link } from '../route'
import { stageDays, type Stage } from '../stages'
import { listDays, type Trip } from '../trips'
import ClaudeSteps from './ClaudeSteps'
import ProposalPreview, { type Row } from './ProposalPreview'

type Props = {
  t: Dictionary
  language: Language
  trip: Trip
  preferences: Preferences
  date?: string
  onChange: (change: (trip: Trip) => Trip) => void
}

type Result = {
  from: 'guide' | 'claude'
  rows: Row[]
  searched: boolean
  ignored: number
  unknownCity: number
  empty: number
  route: Stage[] | null // parcours choisi par l'app, enregistré avec les activités
}

const modeLabels = { plan: 'modePlan', pick: 'modePick' } as const

export default function Proposals({ t, language, trip, preferences, date, onChange }: Props) {
  const guide = useGuide()
  const [mode, setMode] = useState<Mode>(() =>
    readCache<Mode>('meztravel.mode') === 'pick' ? 'pick' : 'plan',
  )
  const [stageIndex, setStageIndex] = useState('') // vide : toutes les étapes
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [failed, setFailed] = useState(false)
  const [added, setAdded] = useState(0)
  const preview = useRef<HTMLDivElement>(null)
  const created = result?.rows.length ? result.from : null

  // L'itinéraire créé apparaît sous les yeux, sans avoir à le chercher.
  useEffect(() => {
    if (created === 'guide') preview.current?.scrollIntoView({ behavior: 'smooth' })
  }, [created])

  const days = listDays(trip.startDate, trip.endDate)
  const stages = date ? [] : stageDays(days, trip.stages ?? [])
  const only = stageIndex === '' ? undefined : stages[Number(stageIndex)]?.days
  const wanted = requestDays(trip, preferences, date).filter((day) => !only || only.includes(day))
  const ready = trip.destination !== '' && wanted.length > 0
  const request = ready ? buildRequest(trip, preferences, mode, language, date, only) : ''
  const covered = guide !== null && guide !== 'error' && guideCovers(guide, trip)

  const toRows = (proposals: Proposal[]) =>
    proposals.map((p) => ({ ...p, chosen: mode === 'plan' && !alreadyPlanned(trip, p) }))

  function reset() {
    setResult(null)
    setFailed(false)
    setAdded(0)
  }

  // Créé dans l'app, à partir du guide inclus : rien ne quitte le téléphone.
  function create() {
    if (!covered) return
    reset()
    const route = automaticRoute(guide, trip, preferences, language)
    const withRoute = route ? { ...trip, stages: route } : trip
    const plan = planDays(guide, withRoute, preferences, wanted, mode, language)
    setResult({
      from: 'guide',
      rows: toRows(plan.proposals),
      searched: true,
      ignored: 0,
      unknownCity: plan.unknownCity.length,
      empty: plan.empty.length,
      route,
    })
  }

  function read() {
    reset()
    // La réponse peut concerner n'importe quel jour du voyage affiché.
    const found = readProposals(answer, date ? [date] : days)
    if (!found || found.proposals.length === 0) return setFailed(true)
    setResult({
      from: 'claude',
      rows: toRows(found.proposals),
      searched: found.searched,
      ignored: found.ignored,
      unknownCity: 0,
      empty: 0,
      route: null,
    })
  }

  function add() {
    const activities = result!.rows
      .filter((row) => row.chosen)
      .map(({ chosen: _, ...proposal }) => ({ id: crypto.randomUUID(), ...proposal }))
    const route = result!.route
    onChange((current) => ({
      ...current,
      activities: [...current.activities, ...activities],
      ...(route && !current.stages?.length ? { stages: route } : {}),
    }))
    setAdded(activities.length)
    setResult(null)
    setAnswer('')
  }

  const consultant = trip.destination !== '' && (
    <ClaudeSteps
      t={t}
      request={request}
      sentNote={t.daysSent}
      answer={answer}
      failed={failed}
      onAnswer={(value) => {
        setAnswer(value)
        reset()
      }}
      onRead={read}
    />
  )

  return (
    <section className="card" id="proposals">
      <h2>{t.proposalsTitle}</h2>

      <div className="chips" role="group" aria-label={t.proposalsTitle}>
        {modes.map((option) => (
          <button
            key={option}
            type="button"
            className="chip"
            aria-pressed={mode === option}
            onClick={() => {
              setMode(option)
              writeCache('meztravel.mode', option)
              reset()
            }}
          >
            {t[modeLabels[option]]}
          </button>
        ))}
      </div>
      <p className="muted">{mode === 'plan' ? t.modePlanNote : t.modePickNote}</p>

      {stages.length > 1 && (
        <label>
          {t.whichStage}
          <select
            value={stageIndex}
            onChange={(e) => {
              setStageIndex(e.target.value)
              reset()
            }}
          >
            <option value="">{t.allStages}</option>
            {stages.map((entry, index) => (
              <option key={index} value={index}>
                {index + 1}. {entry.stage.city} ({t.days}: {entry.days.length})
              </option>
            ))}
          </select>
        </label>
      )}

      {!ready && <p className="error">{trip.destination ? t.needInterests : t.destinationMissing}</p>}

      {guide === null && <p role="status">{t.guideLoading}</p>}
      {guide === 'error' && <p className="error">{t.guideError}</p>}

      {covered && (
        <>
          <p>{t.createInApp}</p>
          <button type="button" className="primary wide" disabled={!ready} onClick={create}>
            ✨ {t.createItinerary}
          </button>
        </>
      )}
      {guide !== null && !covered && <p className="card note">{t.guideOnlyJapan}</p>}

      {result && (
        <>
          {result.unknownCity > 0 && (
            <p className="error" role="alert">
              {t.unknownCityDays}: {result.unknownCity}.{' '}
              {!date && <a href={link(trip.id, 'route')}>{t.routeFirst}</a>}
            </p>
          )}
          {result.empty > 0 && (
            <p className="muted">
              {t.emptyDays}: {result.empty}
            </p>
          )}
          {result.rows.length === 0 ? (
            result.unknownCity === 0 && <p role="status">{t.nothingFound}</p>
          ) : (
            <>
              <div ref={preview} className="itinerary-top">
                <h3>{result.from === 'guide' ? t.yourItinerary : t.preview}</h3>
                {result.route && (
                  <p>
                    🗺️ <strong>{result.route.map((s) => `${s.city} (${s.nights})`).join(' → ')}</strong>
                    <br />
                    <span className="muted">
                      {t.autoRoute} <a href={link(trip.id, 'route')}>{t.changeRoute} ›</a>
                    </span>
                  </p>
                )}
                <p>{t.notSavedYet}</p>
                <button
                  type="button"
                  className="primary wide"
                  disabled={!result.rows.some((row) => row.chosen)}
                  onClick={add}
                >
                  ✅ {t.saveItinerary} ({result.rows.filter((row) => row.chosen).length})
                </button>
              </div>
              <p className="card warning note">
                {result.from === 'guide' ? t.guideWarning : t.proposalWarning}
              </p>
              {!result.searched && <p className="error">{t.noWebSearch}</p>}
              {result.from === 'claude' && (
                <p className="muted">
                  {t.withoutSource}: {result.rows.filter((row) => !row.source).length} /{' '}
                  {result.rows.length}
                </p>
              )}
              {result.ignored > 0 && (
                <p className="muted">
                  {t.ignoredCount}: {result.ignored}
                </p>
              )}
              <ProposalPreview
                t={t}
                language={language}
                trip={trip}
                days={days}
                date={date}
                rows={result.rows}
                onRows={(rows) => setResult({ ...result, rows })}
                onAdd={add}
              />
            </>
          )}
        </>
      )}

      {added > 0 && (
        <p role="status">
          ✓ {t.addedCount}: {added}.{' '}
          <a href={date ? link(trip.id, date) : link(trip.id)}>{t.seeProgram}</a>
        </p>
      )}

      {covered ? (
        <details className="other-way">
          <summary>{t.otherWay}</summary>
          <p>{t.createHow}</p>
          {consultant}
        </details>
      ) : (
        guide !== null && (
          <>
            <p>{t.createHow}</p>
            {consultant}
          </>
        )
      )}
    </section>
  )
}
