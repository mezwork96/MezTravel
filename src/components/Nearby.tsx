import { useState } from 'react'
import type { Dictionary, Language } from '../i18n'
import { mapsSearch, nearbyKinds } from '../nearby'

type Props = {
  t: Dictionary
  language: Language
  places?: string[] // lieux proposés ; le premier est choisi au départ
}

export default function Nearby({ t, language, places = [] }: Props) {
  const [where, setWhere] = useState(places[0] ?? '')
  const [other, setOther] = useState('')

  return (
    <>
      <label>
        {t.nearbyWhere}
        <input value={where} maxLength={200} onChange={(e) => setWhere(e.target.value)} />
      </label>
      {places.length > 1 && (
        <div className="chips" role="group" aria-label={t.nearbyWhere}>
          {places.map((place) => (
            <button
              key={place}
              type="button"
              className="chip"
              aria-pressed={where === place}
              onClick={() => setWhere(place)}
            >
              {place}
            </button>
          ))}
        </div>
      )}
      <p className="muted">{t.nearbyEmpty}</p>

      <div className="chips">
        {nearbyKinds.map((kind) => (
          <a
            key={kind.id}
            className="button chip"
            href={mapsSearch(kind[language], where, language)}
            target="_blank"
            rel="noreferrer noopener"
          >
            <span aria-hidden="true">{kind.icon}</span> {kind[language]}
          </a>
        ))}
      </div>

      <label>
        {t.nearbyOther}
        <input value={other} maxLength={200} onChange={(e) => setOther(e.target.value)} />
      </label>
      {other.trim() && (
        <a
          className="button wide"
          href={mapsSearch(other.trim(), where, language)}
          target="_blank"
          rel="noreferrer noopener"
        >
          {t.nearbyOpen}
        </a>
      )}
      <p className="muted">{t.nearbyNote}</p>
    </>
  )
}
