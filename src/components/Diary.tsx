import { useEffect, useState, type ChangeEvent } from 'react'
import { saveFile } from '../files'
import { deleteFiles, getFile, putFiles } from '../fileStore'
import type { Dictionary } from '../i18n'
import { shrinkPhoto } from '../photos'
import { diaryText, photosOn, setDiaryText, upsert, type Photo, type Trip } from '../trips'

type Props = {
  t: Dictionary
  trip: Trip
  date: string
  onChange: (change: (trip: Trip) => Trip) => boolean
}

export default function Diary({ t, trip, date, onChange }: Props) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [failed, setFailed] = useState(0)

  async function add(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target
    const files = Array.from(input.files ?? [])
    input.value = ''
    if (!files.length) return
    setFailed(0)
    let errors = 0
    // Une photo à la fois, pour ne pas saturer la mémoire du téléphone.
    for (const [index, file] of files.entries()) {
      setProgress({ done: index, total: files.length })
      try {
        const id = crypto.randomUUID()
        const small = await shrinkPhoto(file)
        await putFiles([{ id, bytes: await small.arrayBuffer() }])
        const photo = { id, date, caption: '' }
        onChange((current) => ({ ...current, photos: [...(current.photos ?? []), photo] }))
      } catch {
        errors++
      }
    }
    setFailed(errors)
    setProgress(null)
  }

  function remove(photo: Photo) {
    if (!window.confirm(t.confirmDeletePhoto)) return
    const saved = onChange((current) => ({
      ...current,
      photos: (current.photos ?? []).filter((p) => p.id !== photo.id),
    }))
    if (saved) deleteFiles([photo.id]).catch(() => {})
  }

  return (
    <section className="card">
      <h2>{t.diaryTitle}</h2>
      <label>
        {t.diaryNotes}
        <textarea
          rows={5}
          value={diaryText(trip, date)}
          onChange={(e) => {
            const text = e.target.value
            onChange((current) => setDiaryText(current, date, text))
          }}
        />
      </label>
      <p className="muted">{t.diarySaved}</p>

      {photosOn(trip, date).map((photo) => (
        <PhotoItem
          key={photo.id}
          t={t}
          photo={photo}
          onCaption={(caption) =>
            onChange((current) => ({
              ...current,
              photos: upsert(current.photos ?? [], { ...photo, caption }),
            }))
          }
          onRemove={() => remove(photo)}
        />
      ))}

      <label className="button file-button">
        {progress ? `${t.photoAdding} ${progress.done + 1}/${progress.total}` : `+ ${t.addPhotos}`}
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={progress !== null}
          onChange={add}
          className="hidden-input"
        />
      </label>
      {failed > 0 && (
        <p className="error" role="alert">
          {t.photoFailed} {failed}
        </p>
      )}
      <p className="muted">{t.photoNote}</p>
    </section>
  )
}

type ItemProps = {
  t: Dictionary
  photo: Photo
  onCaption: (caption: string) => void
  onRemove: () => void
}

function PhotoItem({ t, photo, onCaption, onRemove }: ItemProps) {
  const [image, setImage] = useState<{ url: string; blob: Blob } | 'loading' | 'missing'>('loading')

  useEffect(() => {
    let active = true
    let url = ''
    getFile(photo.id, 'image/jpeg').then(
      (blob) => {
        if (!active) return
        if (!blob) return setImage('missing')
        url = URL.createObjectURL(blob)
        setImage({ url, blob })
      },
      () => active && setImage('missing'),
    )
    return () => {
      active = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [photo.id])

  return (
    <figure className="photo">
      {image === 'missing' && <p role="alert">{t.photoMissing}</p>}
      {typeof image === 'object' && <img src={image.url} alt={photo.caption || t.photoAlt} />}
      <input
        value={photo.caption}
        placeholder={t.photoCaption}
        aria-label={t.photoCaption}
        onChange={(e) => onCaption(e.target.value)}
      />
      <div className="actions">
        {typeof image === 'object' && (
          <button
            type="button"
            onClick={() => saveFile(`meztravel-${photo.date}.jpg`, image.blob, 'image/jpeg')}
          >
            {t.sharePdf}
          </button>
        )}
        <button type="button" onClick={onRemove}>
          {t.remove}
        </button>
      </div>
    </figure>
  )
}
