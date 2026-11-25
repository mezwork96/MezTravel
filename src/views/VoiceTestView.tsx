// Page d'essai (étape B0) : ce que l'iPhone sait vraiment faire avec la voix.
// Le compte rendu à copier ne contient jamais ce qui a été dit.
import { useEffect, useRef, useState } from 'react'
import type { Dictionary, Language } from '../i18n'
import { link } from '../route'

type Props = { t: Dictionary; language: Language }

type Spoken = 'it' | 'ja'
const samples: Record<Spoken, { lang: string; text: string }> = {
  it: { lang: 'it-IT', text: 'Buongiorno, dov’è la stazione?' },
  ja: { lang: 'ja-JP', text: 'こんにちは。駅はどこですか。' },
}

type Outcome = 'waiting' | 'ok' | 'failed'
type Check = { outcome: Outcome; detail: string; heard?: string }

const waitLimit = 15_000

export default function VoiceTestView({ t, language }: Props) {
  const [reading, setReading] = useState<Partial<Record<Spoken, Check>>>({})
  const [listening, setListening] = useState<Partial<Record<Spoken, Check>>>({})
  const [heardAnswer, setHeardAnswer] = useState<Partial<Record<Spoken, boolean>>>({})
  const [keyboard, setKeyboard] = useState('')
  const [keyboardWorks, setKeyboardWorks] = useState<boolean | null>(null)
  const [copied, setCopied] = useState<boolean | null>(null)
  const active = useRef<{ abort: () => void } | null>(null)
  const timer = useRef(0)

  const Recognition: any =
    (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
  const canSpeak = 'speechSynthesis' in window
  const installed =
    window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
  const busy = Object.values(listening).some((c) => c?.outcome === 'waiting')

  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      active.current?.abort()
      window.speechSynthesis?.cancel()
    },
    [],
  )

  function speak(code: Spoken) {
    const set = (check: Check) => setReading((c) => ({ ...c, [code]: check }))
    const voices = window.speechSynthesis
      .getVoices()
      .filter((v) => v.lang.toLowerCase().startsWith(code)).length
    const message = new SpeechSynthesisUtterance(samples[code].text)
    message.lang = samples[code].lang
    let started = false
    message.onstart = () => {
      started = true
      set({ outcome: 'ok', detail: `start, voices=${voices}` })
    }
    message.onerror = (event) => set({ outcome: 'failed', detail: `${event.error}, voices=${voices}` })
    set({ outcome: 'waiting', detail: `voices=${voices}` })
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(message)
    window.setTimeout(() => {
      if (!started) set({ outcome: 'failed', detail: `no start, voices=${voices}` })
    }, 5000)
  }

  function listen(code: Spoken) {
    const set = (check: Check) => setListening((c) => ({ ...c, [code]: check }))
    const events: string[] = []
    let heard = ''
    let failure = ''
    window.speechSynthesis?.cancel()
    const finish = () => {
      window.clearTimeout(timer.current)
      active.current = null
      set({
        outcome: heard ? 'ok' : 'failed',
        detail: [...events, failure].filter(Boolean).join(', '),
        heard,
      })
    }
    try {
      const recognition = new Recognition()
      recognition.lang = samples[code].lang
      recognition.interimResults = true
      recognition.continuous = false
      recognition.onstart = () => events.push('start')
      recognition.onaudiostart = () => events.push('audio')
      recognition.onresult = (event: any) => {
        heard = Array.from(event.results as ArrayLike<any>)
          .map((r: any) => r[0].transcript)
          .join(' ')
        if (!events.includes('result')) events.push('result')
        set({ outcome: 'waiting', detail: '', heard })
      }
      recognition.onerror = (event: any) => (failure = `error=${event.error}`)
      recognition.onend = finish
      active.current = recognition
      set({ outcome: 'waiting', detail: '' })
      recognition.start()
      timer.current = window.setTimeout(() => {
        failure ||= 'timeout'
        recognition.abort()
        // Certains navigateurs n'annoncent jamais la fin.
        timer.current = window.setTimeout(finish, 1000)
      }, waitLimit)
    } catch (error) {
      failure = `exception=${(error as Error).name}`
      finish()
    }
  }

  const status = (check?: Check) =>
    check && (
      <p role="status" className={check.outcome === 'failed' ? 'error' : undefined}>
        {check.outcome === 'waiting' ? t.voiceWaiting : check.outcome === 'ok' ? '✓' : t.voiceFailed}
        {check.detail && <span className="muted"> ({check.detail})</span>}
        {check.heard && (
          <>
            <br />
            <strong dir="auto">{check.heard}</strong>
          </>
        )}
      </p>
    )

  const yesNo = (value: boolean | null | undefined, set: (value: boolean) => void) => (
    <div className="chips">
      {[true, false].map((option) => (
        <button
          key={String(option)}
          type="button"
          className="chip"
          aria-pressed={value === option}
          onClick={() => set(option)}
        >
          {option ? t.yes : t.no}
        </button>
      ))}
    </div>
  )

  const line = (check?: Check) => (check ? `${check.outcome} [${check.detail}]` : 'not tried')
  const answer = (value: boolean | null | undefined) =>
    value === true ? 'yes' : value === false ? 'no' : '-'
  const report = [
    'MezTravel voice test',
    `installed=${installed ? 'home screen' : 'browser'} ui=${language}`,
    `device=${navigator.userAgent}`,
    `speech synthesis=${canSpeak} recognition=${Boolean(Recognition)}`,
    ...(['it', 'ja'] as const).map(
      (code) => `read ${code}: ${line(reading[code])} heard=${answer(heardAnswer[code])}`,
    ),
    ...(['it', 'ja'] as const).map((code) => `listen ${code}: ${line(listening[code])}`),
    `keyboard dictation: ${answer(keyboardWorks)}`,
  ].join('\n')

  const names: Record<Spoken, string> = { it: t.italian, ja: t.japanese }

  return (
    <>
      <a className="back" href={link()}>
        ‹ {t.myTrips}
      </a>
      <h2 className="page-title">🎤 {t.voiceTitle}</h2>
      <p className="card">{t.voiceIntro}</p>
      <p className="card warning note">{t.voicePrivacy}</p>

      <section className="card">
        <h2>1. {t.voiceRead}</h2>
        <p className="muted">{t.voiceReadNote}</p>
        {!canSpeak && <p className="error">{t.voiceMissing}</p>}
        {canSpeak &&
          (['it', 'ja'] as const).map((code) => (
            <div key={code}>
              <button type="button" className="wide" onClick={() => speak(code)}>
                🔊 {t.voiceListenTo}: {names[code]}
              </button>
              {status(reading[code])}
              {reading[code] && (
                <>
                  <p>{t.voiceDidYouHear}</p>
                  {yesNo(heardAnswer[code], (value) =>
                    setHeardAnswer((c) => ({ ...c, [code]: value })),
                  )}
                </>
              )}
            </div>
          ))}
      </section>

      <section className="card">
        <h2>2. {t.voiceSpeak}</h2>
        <p className="muted">{t.voiceSpeakNote}</p>
        {!Recognition && <p className="error">{t.voiceMissing}</p>}
        {Boolean(Recognition) &&
          (['it', 'ja'] as const).map((code) => (
            <div key={code}>
              <button
                type="button"
                className="wide"
                disabled={busy}
                onClick={() => listen(code)}
              >
                🎤 {t.voiceSpeakIn}: {names[code]}
              </button>
              <p className="muted" lang={code}>
                {samples[code].text}
              </p>
              {status(listening[code])}
            </div>
          ))}
        {busy && (
          <button type="button" className="wide" onClick={() => active.current?.abort()}>
            {t.voiceStop}
          </button>
        )}
      </section>

      <section className="card">
        <h2>3. {t.voiceKeyboard}</h2>
        <p>{t.voiceKeyboardNote}</p>
        <textarea
          rows={3}
          value={keyboard}
          aria-label={t.voiceKeyboard}
          onChange={(e) => setKeyboard(e.target.value)}
        />
        <p>{t.voiceKeyboardWorks}</p>
        {yesNo(keyboardWorks, setKeyboardWorks)}
      </section>

      <section className="card">
        <h2>4. {t.voiceReport}</h2>
        <p>{t.voiceReportNote}</p>
        <button
          type="button"
          className="primary wide"
          onClick={() =>
            navigator.clipboard.writeText(report).then(
              () => setCopied(true),
              () => setCopied(false),
            )
          }
        >
          {copied ? `✓ ${t.copied}` : t.voiceCopyReport}
        </button>
        {copied === false && <p className="error">{t.copyFailed}</p>}
        <details open={copied === false}>
          <summary>{t.voiceShowReport}</summary>
          <textarea rows={10} readOnly value={report} aria-label={t.voiceShowReport} />
        </details>
      </section>
    </>
  )
}
