// Ce que le guide sait d'une étape : de quoi choisir en connaissance de cause.
import type { Guide } from '../guide/types'
import type { Dictionary } from '../i18n'
import type { Preferences } from '../interests'
import { stageSummary } from '../planner'
import type { Stage } from '../stages'

type Props = {
  t: Dictionary
  guide: Guide
  stage: Stage
  previous?: Stage
  preferences: Preferences
  mustDo?: string[]
}

export default function StageInfo({ t, guide, stage, previous, preferences, mustDo }: Props) {
  const info = stageSummary(guide, stage.city, previous?.city, preferences, mustDo)
  if (!info) return <p className="muted">{t.notInGuide}</p>
  return (
    <div className="stage-info">
      {info.travel !== null && previous && (
        <p className="muted">
          🕒 {t.stageTravel}: ~{Math.round(info.travel / 15) / 4} h{info.how && ` · ${info.how}`}
        </p>
      )}
      {info.travel !== null && info.travel > 240 && <p className="error">{t.longTravel}</p>}
      {stage.nights === 1 && <p className="muted">⚠️ {t.oneNight}</p>}
      <p>
        {t.stagePlaces}: <strong>{info.matching}</strong>
      </p>
      {info.examples.length > 0 && (
        <p className="muted">
          {t.stageExamples}: {info.examples.join(', ')}
        </p>
      )}
      {info.favourites.length > 0 && <p>⭐ {info.favourites.join(', ')}</p>}
    </div>
  )
}
