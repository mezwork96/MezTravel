import Nearby from '../components/Nearby'
import type { Dictionary, Language } from '../i18n'
import { link } from '../route'

export default function NearbyView({ t, language }: { t: Dictionary; language: Language }) {
  return (
    <>
      <a className="back" href={link()}>
        ‹ {t.myTrips}
      </a>
      <h2 className="page-title">🔎 {t.nearbyTitle}</h2>
      <section className="card">
        <Nearby t={t} language={language} />
      </section>
    </>
  )
}
