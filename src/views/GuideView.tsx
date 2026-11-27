import { useState } from 'react'
import SourceLink from '../components/SourceLink'
import { byRegion } from '../guide/regions'
import { useGuide } from '../guide/useGuide'
import { formatDate, type Dictionary, type Language } from '../i18n'
import { interests } from '../interests'
import { guideCovers } from '../planner'
import { link } from '../route'
import type { Trip } from '../trips'

type Props = {
  t: Dictionary
  language: Language
  trips: Trip[]
  onChange: (id: string, change: (trip: Trip) => Trip) => void
}

const plain = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function GuideView({ t, language, trips, onChange }: Props) {
  const [tripId, setTripId] = useState('')
  const [only, setOnly] = useState<'' | 'favourites' | 'highlight' | 'booking'>('')
  const guide = useGuide()
  const [tab, setTab] = useState<'places' | 'info'>('places')
  const [city, setCity] = useState('')
  const [interest, setInterest] = useState('')
  const [search, setSearch] = useState('')

  const header = (
    <>
      <a className="back" href={link()}>
        ‹ {t.myTrips}
      </a>
      <h2 className="page-title">📖 {t.guideTitle}</h2>
    </>
  )
  if (guide === null || guide === 'error') {
    return (
      <>
        {header}
        <p className="card" role="status">
          {guide === null ? t.guideLoading : t.guideError}
        </p>
      </>
    )
  }

  const query = plain(search.trim())
  const filtering = Boolean(city || interest || query || only)
  // Les favoris sont rangés dans un voyage au Japon : ils serviront à son itinéraire.
  const mine = trips.filter((trip) => guideCovers(guide, trip))
  const trip = mine.find((candidate) => candidate.id === tripId) ?? mine[0]
  const favourites = new Set(trip?.mustDo ?? [])
  const toggleFavourite = (id: string) =>
    onChange(trip!.id, (current) => {
      const list = current.mustDo ?? []
      return {
        ...current,
        mustDo: list.includes(id) ? list.filter((other) => other !== id) : [...list, id],
      }
    })
  const cityName = (id: string) => guide.destinations.find((d) => d.id === id)?.name
  const prefectureCount = new Set(guide.destinations.flatMap((d) => d.prefectures)).size
  const prefecturesOf = (id: string) =>
    guide.destinations.find((d) => d.id === id)?.prefectures.join(' ') ?? ''
  const places = guide.places.filter(
    (p) =>
      (!city || p.destination === city) &&
      (!interest || p.interests.includes(interest)) &&
      (only !== 'favourites' || favourites.has(p.id)) &&
      (only !== 'highlight' || p.highlight) &&
      (only !== 'booking' || p.booking) &&
      (!query ||
        plain(
          `${p.name} ${p.area} ${cityName(p.destination)} ${prefecturesOf(p.destination)} ${p.about[language]}`,
        ).includes(query)),
  )
  const destination = guide.destinations.find((d) => d.id === city)

  return (
    <>
      {header}
      <p className="card note">
        {t.guideIntro} {formatDate(guide.checkedOn, language, true)}.
      </p>
      <p className="card">
        🗾 {t.guidePrefectures}: <strong>{prefectureCount} / 47</strong>
      </p>

      <div className="chips" role="group" aria-label={t.guideTitle}>
        {(['places', 'info'] as const).map((id) => (
          <button
            key={id}
            type="button"
            className="chip"
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
          >
            {id === 'places' ? `${t.guidePlaces} (${guide.places.length})` : t.guideInfo}
          </button>
        ))}
      </div>

      {tab === 'info' &&
        guide.sections.map((section) => (
          <details key={section.id} className="card">
            <summary>
              {section.icon} <strong>{section.title[language]}</strong>
            </summary>
            <ul className="plain guide-list">
              {section.points.map((point, index) => (
                <li key={index}>
                  <p>{point.text[language]}</p>
                  {!point.checked && <em className="badge">{t.toConfirm}</em>}
                  {point.changing && <em className="badge">{t.mayChange}</em>}
                  <br />
                  <SourceLink t={t} url={point.source} />
                </li>
              ))}
            </ul>
          </details>
        ))}

      {tab === 'places' && (
        <>
          <section className="card">
            <label>
              {t.guideCity}
              <select value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="">{t.guideAllCities}</option>
                {byRegion(guide.destinations, language).map((group) => (
                  <optgroup key={group.id} label={group.label}>
                    {group.destinations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label>
              {t.interestsTitle}
              <select value={interest} onChange={(e) => setInterest(e.target.value)}>
                <option value="">{t.guideAllInterests}</option>
                {interests
                  .filter((i) => guide.places.some((p) => p.interests.includes(i.id)))
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.icon} {i[language]}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              {t.guideSearch}
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
          </section>

          <section className="card">
            {trip ? (
              <>
                <label>
                  ⭐ {t.favouritesFor}
                  <select value={trip.id} onChange={(e) => setTripId(e.target.value)}>
                    {mine.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.name}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="muted">{t.favouritesNote}</p>
              </>
            ) : (
              <p className="muted">{t.noTripForFavourites}</p>
            )}
            <div className="chips">
              {(
                [
                  ['favourites', `⭐ ${t.onlyFavourites} (${favourites.size})`],
                  ['highlight', `🏅 ${t.mustSeeBadge}`],
                  ['booking', `📅 ${t.bookingBadge}`],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className="chip"
                  aria-pressed={only === id}
                  onClick={() => setOnly(only === id ? '' : id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {destination && (
            <p className="card">
              <strong>{destination.name}</strong>: {destination.about[language]}
            </p>
          )}
          {!filtering && <p className="card">{t.guideChoose}</p>}
          {filtering && (
            <section className="card">
              <p role="status">
                {t.guidePlaces}: {places.length}
              </p>
              <ul className="plain guide-list">
                {places.map((p) => (
                  <li key={p.id}>
                    <strong>{p.name}</strong>
                    <p className="muted">
                      {cityName(p.destination)} · {p.area}
                    </p>
                    <p>{p.about[language]}</p>
                    {p.note[language] && <p className="notes">ℹ️ {p.note[language]}</p>}
                    {p.highlight && <em className="badge">🏅 {t.mustSeeBadge}</em>}
                    {p.booking && <em className="badge">📅 {t.bookingBadge}</em>}
                    {p.when && <em className="badge">{t.onlySomeTimes}</em>}
                    {!p.checked && <em className="badge">{t.toConfirm}</em>}
                    <br />
                    <SourceLink t={t} url={p.source} />
                    {trip && (
                      <button
                        type="button"
                        className="chip favourite"
                        aria-pressed={favourites.has(p.id)}
                        onClick={() => toggleFavourite(p.id)}
                      >
                        {favourites.has(p.id) ? `⭐ ${t.isFavourite}` : `☆ ${t.addFavourite}`}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  )
}
