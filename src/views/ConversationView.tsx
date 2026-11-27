// Traducteur vocal : deux personnes, deux langues, chacune sa moitié d'écran.
// Sans micro utilisable, on écrit ou on dicte avec le clavier.
import { useEffect, useRef, useState } from 'react'
import { readCache, writeCache } from '../cache'
import type { Dictionary, Language } from '../i18n'
import { phraseGroups, phraseLanguages } from '../phrases'
import { link } from '../route'
import { canListen, listen, speak, stopSpeaking, unlockSpeech, type MicProblem } from '../speech'
import { checkText, QuotaError, translate, translationLanguages } from '../translate'

type Props = { t: Dictionary; language: Language }

type Side = 'mine' | 'theirs'
type Message = { from: Side; said: string; result: string }

const settingsKey = 'meztravel.conversation'

// Le nom d'une langue écrit dans cette langue : l'autre personne le reconnaît.
function ownName(code: string) {
  try {
    return new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? code
  } catch {
    return code
  }
}

export default function ConversationView({ t, language }: Props) {
  const saved = readCache<{ mine: string; theirs: string; turned: boolean }>(settingsKey)
  const [codes, setCodes] = useState<Record<Side, string>>({
    mine: saved?.mine ?? language,
    theirs: saved?.theirs ?? 'ja',
  })
  const [turned, setTurned] = useState(saved?.turned ?? false)
  const [drafts, setDrafts] = useState<Record<Side, string>>({ mine: '', theirs: '' })
  const [message, setMessage] = useState<Message | null>(null)
  const [listening, setListening] = useState<Side | null>(null)
  const [translating, setTranslating] = useState(false)
  const [problem, setProblem] = useState<{
    side: Side
    key: keyof Dictionary
    mic?: string // code technique d'une panne du micro
  } | null>(null)
  const [readAloud, setReadAloud] = useState(true)
  const microphone = useRef<ReturnType<typeof listen> | null>(null)
  const request = useRef(0)

  useEffect(() => writeCache(settingsKey, { ...codes, turned }), [codes, turned])
  useEffect(
    () => () => {
      request.current++
      microphone.current?.cancel()
      stopSpeaking()
    },
    [],
  )

  const other = (side: Side): Side => (side === 'mine' ? 'theirs' : 'mine')
  const same = codes.mine === codes.theirs
  const busy = listening !== null || translating
  const names = new Intl.DisplayNames([language], { type: 'language' })
  const options = translationLanguages
    .map((code) => ({ code, name: names.of(code) ?? code }))
    .sort((a, b) => a.name.localeCompare(b.name, language))

  // Les phrases prêtes n'existent qu'entre ces quatre langues.
  const ready = (code: string) => phraseLanguages.find((known) => known === code)
  const mineReady = ready(codes.mine)
  const theirsReady = ready(codes.theirs)
  const readyCodes = mineReady && theirsReady && !same ? { mine: mineReady } : null

  function say(text: string, side: Side) {
    speak(text, codes[side], () => setProblem({ side, key: 'speakFailed' }))
  }

  async function send(side: Side, text: string) {
    const trouble = checkText(text)
    if (trouble === 'empty' || same) return
    if (trouble) {
      setProblem({ side, key: trouble === 'tooLong' ? 'textTooLong' : 'oneParagraph' })
      return
    }
    const id = ++request.current
    setProblem(null)
    setMessage(null)
    setTranslating(true)
    try {
      const result = await translate(text, codes[side], codes[other(side)])
      if (id !== request.current) return
      setMessage({ from: side, said: text.trim(), result })
      setDrafts((current) => ({ ...current, [side]: '' }))
      if (readAloud) say(result, other(side))
    } catch (error) {
      if (id !== request.current) return
      setProblem({ side, key: error instanceof QuotaError ? 'translateQuota' : 'translateError' })
    } finally {
      if (id === request.current) setTranslating(false)
    }
  }

  function talk(side: Side) {
    if (listening === side) {
      microphone.current?.stop()
      return
    }
    stopSpeaking()
    unlockSpeech()
    setProblem(null)
    setListening(side)
    microphone.current = listen(codes[side], {
      onText: (text) => setDrafts((current) => ({ ...current, [side]: text })),
      onEnd: (text, trouble: MicProblem | null, detail) => {
        microphone.current = null
        setListening(null)
        if (trouble) setProblem({ side, key: trouble, mic: detail })
        else send(side, text)
      },
    })
  }

  const half = (side: Side) => {
    const code = codes[side]
    const shown = message && (message.from === side ? message.said : message.result)
    const translated = message && message.from !== side
    return (
      <section
        className={`card half${side === 'theirs' && turned ? ' turned' : ''}`}
        id={side === 'theirs' ? 'their-half' : undefined}
        aria-label={ownName(code)}
      >
        <select
          value={code}
          aria-label={side === 'mine' ? t.myLanguage : t.theirLanguage}
          disabled={busy}
          onChange={(e) => {
            setCodes((current) => ({ ...current, [side]: e.target.value }))
            setMessage(null)
            setProblem(null)
            setDrafts({ mine: '', theirs: '' })
          }}
        >
          {options.map((o) => (
            <option key={o.code} value={o.code}>
              {ownName(o.code).toLowerCase() === o.name.toLowerCase()
                ? o.name
                : `${ownName(o.code)} · ${o.name}`}
            </option>
          ))}
        </select>

        {shown && (
          <p
            className={translated ? 'translation' : 'said'}
            lang={code}
            dir="auto"
            aria-live="polite"
          >
            {shown}
          </p>
        )}
        {translated && (
          <button type="button" className="wide" onClick={() => say(shown!, side)}>
            🔊 {ownName(code)}
          </button>
        )}

        {canListen() && (
          <button
            type="button"
            className="primary wide talk"
            aria-pressed={listening === side}
            disabled={same || translating || (listening !== null && listening !== side)}
            onClick={() => talk(side)}
          >
            {listening === side ? '⏹' : '🎤'} <span lang={code}>{ownName(code)}</span>
          </button>
        )}

        <textarea
          rows={2}
          lang={code}
          dir="auto"
          value={drafts[side]}
          placeholder={side === 'mine' ? t.writeOrDictate : ownName(code)}
          aria-label={`${t.writeOrDictate} (${ownName(code)})`}
          onChange={(e) => setDrafts((current) => ({ ...current, [side]: e.target.value }))}
        />
        <button
          type="button"
          className="wide"
          disabled={same || busy || !drafts[side].trim()}
          onClick={() => {
            stopSpeaking()
            unlockSpeech()
            send(side, drafts[side])
          }}
        >
          ➜ {ownName(codes[other(side)])}
        </button>

        {problem?.side === side && (
          <>
            <p role="alert" className="error">
              {t[problem.key]}
              {problem.mic && ` (${problem.mic})`}
            </p>
            {problem.mic && (
              <p>
                <a href={link('voice')}>🎤 {t.voiceTitle} ›</a>
              </p>
            )}
          </>
        )}
      </section>
    )
  }

  return (
    <>
      <a className="back" href={link()}>
        ‹ {t.myTrips}
      </a>
      <h2 className="page-title">🗣️ {t.conversationTitle}</h2>

      <details className="card">
        <summary>{t.conversationHelpTitle}</summary>
        <p>{t.conversationHelp}</p>
        {!canListen() && <p>{t.micMissing}</p>}
        <p>
          <a href={link('voice')}>🎤 {t.voiceTitle} ›</a>
        </p>
      </details>
      <p className="card warning note">{t.conversationPrivacy}</p>
      {same && <p className="error">{t.sameLanguage}</p>}

      {readyCodes && (
        <details className="card">
          <summary>⭐ {t.readyPhrases}</summary>
          <p className="muted">{t.readyPhrasesNote}</p>
          {phraseGroups.map((group) => (
            <details key={group.en} className="region">
              <summary>
                {group.icon} {group[language]} ({group.phrases.length})
              </summary>
              <ul className="plain results">
                {group.phrases.map((phrase) => (
                  <li key={phrase.ja}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        stopSpeaking()
                        unlockSpeech()
                        send('mine', phrase[readyCodes.mine])
                        document.getElementById('their-half')?.scrollIntoView({ behavior: 'smooth' })
                      }}
                    >
                      <span lang={readyCodes.mine}>{phrase[readyCodes.mine]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </details>
      )}

      {half('theirs')}
      <p role="status" className="muted">
        {translating ? t.translating : listening ? t.voiceWaiting : ''}
      </p>
      {half('mine')}

      <section className="card">
        <label className="option">
          <input type="checkbox" checked={turned} onChange={(e) => setTurned(e.target.checked)} />
          <span>{t.turnTheirHalf}</span>
        </label>
        <label className="option">
          <input
            type="checkbox"
            checked={readAloud}
            onChange={(e) => setReadAloud(e.target.checked)}
          />
          <span>{t.readAloud}</span>
        </label>
        <p className="muted">{t.translateCheck}</p>
      </section>
    </>
  )
}
