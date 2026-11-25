// Navigation par l'adresse (#/voyage/jour) : le geste « retour » fonctionne.
import { useEffect, useState } from 'react'

export type Route = { tripId?: string; date?: string; extra?: string }

function read(): Route {
  const [tripId, date, extra] = window.location.hash.replace(/^#\/?/, '').split('/')
  return { tripId: tripId || undefined, date: date || undefined, extra: extra || undefined }
}

export function link(tripId?: string, date?: string): string {
  return '#/' + [tripId, date].filter(Boolean).join('/')
}

export function useRoute(): Route {
  const [route, setRoute] = useState(read)

  useEffect(() => {
    const change = () => {
      setRoute(read())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', change)
    return () => window.removeEventListener('hashchange', change)
  }, [])

  return route
}
