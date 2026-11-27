import { useCallback, useEffect, useRef, useState } from 'react'
import { emptyData, parseData, type Data } from './trips'

const storageKey = 'meztravel.data'

type State = {
  data: Data
  // Des données existent mais sont illisibles : on n'écrit rien pour ne pas les écraser.
  damaged: boolean
  saveFailed: boolean
}

function load(): State {
  try {
    const text = localStorage.getItem(storageKey)
    if (text === null) return { data: emptyData, damaged: false, saveFailed: false }
    const data = parseData(text)
    return data
      ? { data, damaged: false, saveFailed: false }
      : { data: emptyData, damaged: true, saveFailed: false }
  } catch {
    return { data: emptyData, damaged: false, saveFailed: true }
  }
}

export function rawStoredData(): string {
  return localStorage.getItem(storageKey) ?? ''
}

export function useStore() {
  const [state, setState] = useState<State>(load)
  const latest = useRef(state)

  const apply = useCallback((next: State) => {
    latest.current = next
    setState(next)
  }, [])

  // Renvoie true seulement si le changement est réellement enregistré.
  const update = useCallback(
    (change: (data: Data) => Data): boolean => {
      if (latest.current.damaged) return false
      const data = change(latest.current.data)
      const text = JSON.stringify(data)
      // Des données que l'app ne saurait pas relire bloqueraient tout au redémarrage.
      if (!parseData(text)) {
        apply({ ...latest.current, saveFailed: true })
        return false
      }
      let saveFailed = false
      try {
        localStorage.setItem(storageKey, text)
      } catch {
        saveFailed = true
      }
      apply({ data, damaged: false, saveFailed })
      return !saveFailed
    },
    [apply],
  )

  useEffect(() => {
    // Demande au navigateur de ne pas effacer les données pour faire de la place.
    navigator.storage?.persist?.().catch(() => {})
    // Si l'app est ouverte deux fois, chaque fenêtre relit les changements de l'autre.
    const reload = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) apply(load())
    }
    window.addEventListener('storage', reload)
    return () => window.removeEventListener('storage', reload)
  }, [apply])

  return { ...state, update }
}

export type Update = ReturnType<typeof useStore>['update']
