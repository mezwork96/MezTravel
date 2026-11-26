// Voix du téléphone : lecture à voix haute et reconnaissance de la parole.
// Fonctions du navigateur : sans clé et sans paiement. Selon l'appareil, la voix
// ou le micro peuvent être traités hors du téléphone : l'écran le dit.

// Les lecteurs et le micro attendent une langue avec son pays.
const withRegion: Record<string, string> = {
  it: 'it-IT', en: 'en-US', fr: 'fr-FR', ja: 'ja-JP', de: 'de-DE', es: 'es-ES', pt: 'pt-PT',
  ko: 'ko-KR', th: 'th-TH', vi: 'vi-VN', id: 'id-ID', ms: 'ms-MY', hi: 'hi-IN', ar: 'ar-SA',
  he: 'he-IL', tr: 'tr-TR', el: 'el-GR', ru: 'ru-RU', uk: 'uk-UA', pl: 'pl-PL', cs: 'cs-CZ',
  sk: 'sk-SK', hu: 'hu-HU', ro: 'ro-RO', bg: 'bg-BG', hr: 'hr-HR', sl: 'sl-SI', sr: 'sr-RS',
  nl: 'nl-NL', da: 'da-DK', sv: 'sv-SE', no: 'nb-NO', fi: 'fi-FI', is: 'is-IS', et: 'et-EE',
  lv: 'lv-LV', lt: 'lt-LT', fa: 'fa-IR', sw: 'sw-KE',
}

export const speechLang = (code: string) => withRegion[code] ?? code

type Voice = { lang: string; localService?: boolean; default?: boolean }

// La meilleure voix installée : même pays d'abord, sinon même langue.
// Pour le chinois, un autre pays peut être une autre langue parlée : on ne devine pas.
export function pickVoice<V extends Voice>(voices: V[], code: string): V | undefined {
  const wanted = speechLang(code).toLowerCase()
  const language = wanted.split('-')[0]
  const tag = (v: V) => v.lang.toLowerCase().replace('_', '-')
  const exact = voices.filter((v) => tag(v) === wanted)
  const close = language === 'zh' ? [] : voices.filter((v) => tag(v).split('-')[0] === language)
  const found = exact.length ? exact : close
  return found.find((v) => v.default) ?? found.find((v) => v.localService) ?? found[0]
}

export const canSpeak = () => 'speechSynthesis' in globalThis

// Sur iPhone, la première lecture doit partir d'un toucher : à appeler dans le clic,
// avant d'attendre la traduction.
export function unlockSpeech() {
  if (!canSpeak()) return
  const silent = new SpeechSynthesisUtterance(' ')
  silent.volume = 0
  window.speechSynthesis.speak(silent)
}

export const stopSpeaking = () => {
  if (canSpeak()) window.speechSynthesis.cancel()
}

export function speak(text: string, code: string, onFail: () => void) {
  if (!canSpeak()) return onFail()
  window.speechSynthesis.cancel()
  const message = new SpeechSynthesisUtterance(text)
  message.lang = speechLang(code)
  const voice = pickVoice(window.speechSynthesis.getVoices(), code)
  if (voice) message.voice = voice
  message.rate = 0.9
  message.onerror = (event) => {
    // Couper une lecture pour en lancer une autre n'est pas une panne.
    if (event.error !== 'canceled' && event.error !== 'interrupted') onFail()
  }
  window.speechSynthesis.speak(message)
}

export type MicProblem = 'micDenied' | 'micNothing' | 'micFailed'

export function micProblem(error: string): MicProblem {
  if (error === 'not-allowed' || error === 'service-not-allowed') return 'micDenied'
  if (error === 'no-speech') return 'micNothing'
  return 'micFailed'
}

const recognitionClass = (): any =>
  (globalThis as any).SpeechRecognition ?? (globalThis as any).webkitSpeechRecognition

export const canListen = () => Boolean(recognitionClass())

type Listener = {
  onText: (text: string) => void // pendant qu'on parle
  onEnd: (text: string, problem: MicProblem | null) => void // une seule fois
}

// Écoute une phrase. « stop » garde ce qui a été entendu, « cancel » l'oublie.
export function listen(code: string, { onText, onEnd }: Listener, limit = 20_000) {
  let heard = ''
  let failure = ''
  let finished = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const finish = () => {
    if (finished) return
    finished = true
    clearTimeout(timer)
    onEnd(heard.trim(), heard.trim() ? null : micProblem(failure || 'no-speech'))
  }
  let recognition: any
  // Certains navigateurs n'annoncent jamais la fin.
  const stop = () => {
    clearTimeout(timer)
    recognition?.stop()
    timer = setTimeout(finish, 2000)
  }
  try {
    recognition = new (recognitionClass())()
    recognition.lang = speechLang(code)
    recognition.interimResults = true
    recognition.continuous = false
    recognition.onresult = (event: any) => {
      heard = Array.from(event.results as ArrayLike<any>)
        .map((r: any) => r[0].transcript)
        .join('')
      onText(heard)
    }
    recognition.onerror = (event: any) => (failure = event.error)
    recognition.onend = finish
    recognition.start()
    timer = setTimeout(stop, limit)
  } catch {
    failure = 'exception'
    queueMicrotask(finish)
  }
  return {
    stop,
    cancel() {
      finished = true
      clearTimeout(timer)
      recognition?.abort()
    },
  }
}
