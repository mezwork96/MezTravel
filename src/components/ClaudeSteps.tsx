import { useState } from 'react'
import type { Dictionary } from '../i18n'

type Props = {
  t: Dictionary
  request: string // vide tant que la demande ne peut pas être préparée
  sentNote: string // ce que contient la demande
  answer: string
  failed: boolean
  onAnswer: (answer: string) => void
  onRead: () => void
}

// Les trois étapes avec l'application Claude : copier, demander, coller.
export default function ClaudeSteps({ t, request, sentNote, answer, failed, onAnswer, onRead }: Props) {
  // La demande copiée, pour que la coche disparaisse si elle change.
  const [copied, setCopied] = useState<{ request: string; ok: boolean } | null>(null)
  const status = copied?.request === request ? copied.ok : null

  return (
    <>
      {request && (
        <>
          <h3>1. {t.stepCopy}</h3>
          <button
            type="button"
            className="primary wide"
            onClick={() =>
              navigator.clipboard.writeText(request).then(
                () => setCopied({ request, ok: true }),
                () => setCopied({ request, ok: false }),
              )
            }
          >
            {status ? `✓ ${t.copied}` : t.copyRequest}
          </button>
          {status === false && <p className="error">{t.copyFailed}</p>}
          <details open={status === false}>
            <summary>{t.showRequest}</summary>
            <textarea rows={10} readOnly value={request} aria-label={t.showRequest} />
          </details>

          <h3>2. {t.stepAsk}</h3>
          <p>{t.stepAskNote}</p>
          <p className="card warning note">{t.turnOnSearch}</p>
          <p className="muted">{sentNote}</p>
          <p>
            <a href="https://claude.ai/new" target="_blank" rel="noreferrer">
              {t.openClaude}
            </a>
          </p>
        </>
      )}

      <h3>3. {t.stepPaste}</h3>
      <textarea
        rows={5}
        value={answer}
        aria-label={t.stepPaste}
        placeholder={t.pastePlaceholder}
        onChange={(e) => onAnswer(e.target.value)}
      />
      <button type="button" className="wide" disabled={!answer.trim()} onClick={onRead}>
        {t.readAnswer}
      </button>
      {failed && (
        <p className="error" role="alert">
          {t.answerUnreadable}
        </p>
      )}
    </>
  )
}
