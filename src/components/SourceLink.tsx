import { isWebUrl } from '../answer'
import type { Dictionary } from '../i18n'

// Le nom du site est affiché pour qu'on voie d'où vient l'information : un lien
// proposé par une IA n'est pas une preuve.
export default function SourceLink({ t, url }: { t: Dictionary; url?: string }) {
  if (!isWebUrl(url)) return null
  return (
    <a className="source" href={url} target="_blank" rel="noreferrer noopener">
      🔗 {t.source}: {new URL(url).hostname.replace(/^www\./, '')}
    </a>
  )
}
