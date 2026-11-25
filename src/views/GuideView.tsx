import { useState } from 'react'
import SourceLink from '../components/SourceLink'
import { useGuide } from '../guide/useGuide'
import { formatDate, type Dictionary, type Language } from '../i18n'
import { interests } from '../interests'
import { link } from '../route'

type Props = { t: Dictionary; language: Language }

const plain = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function GuideView({ t, language }: Props) {
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
  const filtering = Boolean(city || interest || query)
  const places = guide.places.filter(
    (p) =>
      (!city || p.destination === city) &&
      (!interest || p.interests.includes(interest)) &&
      (!query || plain(`${p.name} ${p.area} ${p.about[language]}`).includes(query)),
  )
  const destination = guide.destinations.find((d) => d.id === city)
  const cityName = (id: string) => guide.destinations.find((d) => d.id === id)?.name

  return (
    <>
      {header}
      <p className="card note">
        {t.guideIntro} {formatDate(guide.checkedOn, language, true)}.
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
                {guide.destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
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
                    {p.when && <em className="badge">{t.onlySomeTimes}</em>}
                    {!p.checked && <em className="badge">{t.toConfirm}</em>}
                    <br />
                    <SourceLink t={t} url={p.source} />
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
