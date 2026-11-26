import { useEffect, useRef, useState, type FormEvent } from 'react'
import { readCache, writeCache } from '../cache'
import type { Dictionary, Language } from '../i18n'
import { link } from '../route'
import { speak, stopSpeaking } from '../speech'
import {
  byteLength,
  checkText,
  clearHistory,
  history,
  maxBytes,
  QuotaError,
  translate,
  translationLanguages,
  type Translation,
} from '../translate'

type Props = { t: Dictionary; language: Language }

type State =
  | { kind: 'idle' | 'loading' }
  | { kind: 'done'; translation: Translation }
  | { kind: 'error'; message: keyof Dictionary }

export default function TranslatorView({ t, language }: Props) {
  const saved = readCache<{ from: string; to: string }>('meztravel.translator')
  const [from, setFrom] = useState<string>(saved?.from ?? language)
  const [to, setTo] = useState(saved?.to ?? 'ja')
  const [text, setText] = useState('')
  const [state, setState] = useState<State>({ kind: 'idle' })
  const [past, setPast] = useState(history)
  const [copied, setCopied] = useState(false)
  // Une réponse arrivée après un changement de texte ou de langue est ignorée.
  const request = useRef(0)
  const [speakFailed, setSpeakFailed] = useState(false)
  useEffect(() => stopSpeaking, [])

  useEffect(() => writeCache('meztravel.translator', { from, to }), [from, to])

  const names = new Intl.DisplayNames([language], { type: 'language' })
  const options = translationLanguages
    .map((code) => ({ code, name: names.of(code) ?? code }))
    .sort((a, b) => a.name.localeCompare(b.name, language))

  const problem = checkText(text)

  function reset() {
    request.current++
    stopSpeaking()
    setSpeakFailed(false)
    setState({ kind: 'idle' })
    setCopied(false)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (problem || from === to) return
    const id = ++request.current
    setCopied(false)
    setState({ kind: 'loading' })
    try {
      const result = await translate(text, from, to)
      setPast(history())
      if (id === request.current) {
        setState({ kind: 'done', translation: { from, to, text: text.trim(), result } })
      }
    } catch (error) {
      if (id !== request.current) return
      const message = error instanceof QuotaError ? 'translateQuota' : 'translateError'
      setState({ kind: 'error', message })
    }
  }

  const select = (label: string, value: string, change: (code: string) => void) => (
    <label>
      {label}
      <select
        value={value}
        onChange={(e) => {
          change(e.target.value)
          reset()
        }}
      >
        {options.map((o) => (
          <option key={o.code} value={o.code}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  )

  function show(item: Translation) {
    request.current++
    stopSpeaking()
    setSpeakFailed(false)
    setFrom(item.from)
    setTo(item.to)
    setText(item.text)
    setCopied(false)
    setState({ kind: 'done', translation: item })
    window.scrollTo(0, 0)
  }

  return (
    <>
      <a className="back" href={link()}>
        ‹ {t.myTrips}
      </a>
      <h2 className="page-title">{t.translator}</h2>

      <form className="card" onSubmit={submit}>
        {select(t.fromCurrency, from, setFrom)}
        <button
          type="button"
          className="wide"
          onClick={() => {
            setFrom(to)
            setTo(from)
            // La traduction obtenue devient le texte à traduire en sens inverse.
            if (state.kind === 'done') setText(state.translation.result)
            reset()
          }}
        >
          ⇅ {t.swap}
        </button>
        {select(t.toCurrency, to, setTo)}

        <label>
          {t.textToTranslate}
          <textarea
            rows={4}
            lang={from}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              reset()
            }}
          />
        </label>
        <p className={problem === 'tooLong' ? 'error' : 'muted'}>
          {t.textLength}: {Math.min(999, Math.round((byteLength(text.trim()) / maxBytes) * 100))}%
        </p>
        {problem === 'tooLong' && <p className="error">{t.textTooLong}</p>}
        {problem === 'paragraphs' && <p className="error">{t.oneParagraph}</p>}
        {from === to && <p className="error">{t.sameLanguage}</p>}

        <p className="card warning note">{t.translatePrivacy}</p>

        <button
          type="submit"
          className="primary wide"
          disabled={problem !== null || from === to || state.kind === 'loading'}
        >
          {state.kind === 'loading' ? t.translating : t.translateButton}
        </button>

        {state.kind === 'error' && (
          <p role="alert" className="error">
            {t[state.message]}
          </p>
        )}
        {state.kind === 'done' && (
          <>
            <p className="translation" lang={state.translation.to} dir="auto" role="status">
              {state.translation.result}
            </p>
            <div className="actions">
              <button
                type="button"
                onClick={() => {
                  setSpeakFailed(false)
                  speak(state.translation.result, state.translation.to, () => setSpeakFailed(true))
                }}
              >
                🔊 {t.listenAloud}
              </button>
              <button
                type="button"
                onClick={() =>
                  navigator.clipboard.writeText(state.translation.result).then(
                    () => setCopied(true),
                    () => {},
                  )
                }
              >
                {copied ? `✓ ${t.copied}` : t.copy}
              </button>
            </div>
            {speakFailed && (
              <p role="alert" className="error">
                {t.speakFailed}
              </p>
            )}
            <p className="muted">{t.translateCheck}</p>
          </>
        )}
        <p className="muted">
          <a href="https://mymemory.translated.net/" target="_blank" rel="noreferrer">
            MyMemory
          </a>{' '}
          ·{' '}
          <a
            href="https://mymemory.translated.net/terms-and-conditions"
            target="_blank"
            rel="noreferrer"
          >
            {t.serviceTerms}
          </a>
        </p>
      </form>

      {past.length > 0 && (
        <section className="card">
          <h2>{t.recentTranslations}</h2>
          <p className="muted">{t.historyNote}</p>
          <ul className="plain results">
            {past.map((item) => (
              <li key={`${item.from}|${item.to}|${item.text}`}>
                <button type="button" onClick={() => show(item)}>
                  <span>
                    {item.text}
                    <br />
                    <strong lang={item.to}>{item.result}</strong>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="wide"
            onClick={() => {
              clearHistory()
              setPast([])
            }}
          >
            {t.clearHistory}
          </button>
        </section>
      )}
    </>
  )
}
