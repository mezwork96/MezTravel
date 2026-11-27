import { useState, type ChangeEvent } from 'react'
import { attachments, fileIds, fromBase64, readBackup, toBase64, writeBackup, type StoredFile } from '../backup'
import { saveFile } from '../files'
import { getFile, putFiles } from '../fileStore'
import type { Dictionary } from '../i18n'
import type { Update } from '../store'
import { mergeData, today, type Data } from '../trips'

type Props = { t: Dictionary; data: Data; update: Update }

type Message = 'backupInvalid' | 'backupRestored' | 'backupFailed' | 'backupMissingFiles' | null

export default function Backup({ t, data, update }: Props) {
  const [message, setMessage] = useState<Message>(null)
  const [busy, setBusy] = useState(false)
  // La copie est préparée d'abord, puis enregistrée par un second bouton :
  // l'iPhone n'ouvre le menu de partage que juste après un toucher.
  const [prepared, setPrepared] = useState<{ source: Data; text: string } | null>(null)
  const ready = prepared?.source === data ? prepared.text : null

  async function prepare() {
    setBusy(true)
    setMessage(null)
    try {
      const files: Record<string, StoredFile> = {}
      let missing = false
      for (const { id, name } of attachments(data.trips)) {
        const blob = await getFile(id)
        if (!blob) {
          missing = true
          continue
        }
        files[id] = { name, base64: toBase64(new Uint8Array(await blob.arrayBuffer())) }
      }
      setPrepared({ source: data, text: writeBackup({ data, files }) })
      if (missing) setMessage('backupMissingFiles')
    } catch {
      setMessage('backupFailed')
    }
    setBusy(false)
  }

  async function restore(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return
    const incoming = readBackup(await file.text().catch(() => ''))
    input.value = '' // permet de choisir à nouveau le même fichier
    if (!incoming) return setMessage('backupInvalid')
    const names = incoming.data.trips.map((trip) => `• ${trip.name}`).join('\n')
    if (!window.confirm(`${t.backupConfirm}\n${names}`)) return
    setBusy(true)
    try {
      // Les PDF d'abord : s'ils ne s'enregistrent pas, les voyages ne changent pas.
      const wanted = new Set(fileIds(incoming.data.trips))
      const files = Object.entries(incoming.files).filter(([id]) => wanted.has(id))
      await putFiles(files.map(([id, f]) => ({ id, bytes: fromBase64(f.base64).buffer })))
      if (!update((current) => mergeData(current, incoming.data))) throw new Error('not saved')
      const absent = await Promise.all([...wanted].map(async (id) => !(await getFile(id))))
      setMessage(absent.includes(true) ? 'backupMissingFiles' : 'backupRestored')
    } catch {
      setMessage('backupFailed')
    }
    setBusy(false)
  }

  return (
    <section className="card">
      <h2>{t.backupTitle}</h2>
      <p>{t.backupText}</p>
      <div className="actions">
        {ready ? (
          <button
            type="button"
            className="primary"
            onClick={() => saveFile(`meztravel-${today()}.json`, ready)}
          >
            {t.backupDownload}
          </button>
        ) : (
          <button type="button" disabled={busy || data.trips.length === 0} onClick={prepare}>
            {t.backupSave}
          </button>
        )}
        <label className="button">
          {t.backupRestore}
          <input
            type="file"
            accept=".json,application/json"
            onChange={restore}
            disabled={busy}
            className="hidden-input"
          />
        </label>
      </div>
      {ready && (
        <p className="muted">
          {t.backupSize}: {(ready.length / 1_000_000).toFixed(1)} MB
        </p>
      )}
      {message && (
        <p role="status" className={message === 'backupRestored' ? 'success' : 'error'}>
          {t[message]}
        </p>
      )}
    </section>
  )
}
