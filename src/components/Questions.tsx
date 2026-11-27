// Les questions précises : pour tout le voyage, ou pour une seule journée.
import type { Dictionary, Language } from '../i18n'
import {
  dayAnswersOn,
  defaultPreferences,
  interests,
  maxTop,
  paces,
  setDay,
  toggleTop,
  type Preferences,
} from '../interests'
import { answered, questions } from '../questions'

type Props = {
  t: Dictionary
  language: Language
  preferences: Preferences
  date?: string
  onChange: (change: (current: Preferences) => Preferences) => void
}

const paceLabels = { calm: 'paceCalm', normal: 'paceNormal', intense: 'paceIntense' } as const

type Choice = { id: string; label: string }

export default function Questions({ t, language, preferences, date, onChange }: Props) {
  const day = date ? dayAnswersOn(preferences, date) : undefined
  const answers = date ? (day?.answers ?? {}) : (preferences.answers ?? {})
  const asked = questions.filter(
    (q) =>
      (!date || q.perDay) &&
      (!q.needs || preferences.interests.includes(q.needs) || Boolean(answers[q.id])),
  )
  const chosen = interests.filter((i) => preferences.interests.includes(i.id))
  const top = (preferences.top ?? []).filter((id) => preferences.interests.includes(id))

  const ask = (title: string, choices: Choice[], picked: string[], pick: (id: string) => void) => (
    <fieldset className="question" key={title}>
      <legend>{title}</legend>
      <div className="chips">
        {choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            className="chip"
            aria-pressed={picked.includes(choice.id)}
            onClick={() => pick(choice.id)}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </fieldset>
  )

  const answer = (question: string, option: string) =>
    onChange((current) => {
      if (!date) {
        return { ...current, answers: answered(current.answers ?? {}, question, option) }
      }
      const own = dayAnswersOn(current, date)
      return setDay(current, {
        date,
        pace: own?.pace,
        answers: answered(own?.answers ?? {}, question, option),
      })
    })

  return (
    <section className="card">
      <h2>{date ? t.questionsDay : t.questionsTitle}</h2>
      <p className="muted">{date ? t.questionsDayNote : t.questionsNote}</p>

      {date &&
        ask(
          t.paceDay,
          paces.map((pace) => ({ id: pace, label: t[paceLabels[pace]] })),
          day?.pace ? [day.pace] : [],
          (id) =>
            onChange((current) => {
              const own = dayAnswersOn(current, date)
              const pace = paces.find((p) => p === id && p !== own?.pace)
              return setDay(current, { date, pace, answers: own?.answers ?? {} })
            }),
        )}

      {!date &&
        chosen.length > 1 &&
        ask(
          `${t.topQuestion} (${top.length}/${maxTop})`,
          chosen.map((i) => ({ id: i.id, label: `${i.icon} ${i[language]}` })),
          top,
          (id) => onChange((current) => toggleTop(current ?? defaultPreferences, id)),
        )}

      {asked.map((question) =>
        ask(
          question.ask[language],
          question.options.map((o) => ({ id: o.id, label: o[language] })),
          answers[question.id] ? [answers[question.id]] : [],
          (id) => answer(question.id, id),
        ),
      )}
    </section>
  )
}
