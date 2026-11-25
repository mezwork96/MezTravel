import { useEffect, useState } from 'react'
import type { Guide } from './types'

// Chargé à part, seulement quand un écran en a besoin (et gardé hors ligne par l'app).
let loading: Promise<Guide> | null = null

export function useGuide(): Guide | null | 'error' {
  const [guide, setGuide] = useState<Guide | null | 'error'>(null)
  useEffect(() => {
    let active = true
    loading ??= import('./japan.json').then((module) => module.default as unknown as Guide)
    loading.then(
      (value) => active && setGuide(value),
      () => {
        loading = null
        if (active) setGuide('error')
      },
    )
    return () => {
      active = false
    }
  }, [])
  return guide
}
