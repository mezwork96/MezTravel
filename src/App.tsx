import { fileIds } from './backup'
import { saveFile } from './files'
import { deleteFiles } from './fileStore'
import { languages, useLanguage } from './i18n'
import { link, useRoute } from './route'
import { rawStoredData, useStore } from './store'
import { listDays, upsert, type Trip } from './trips'
import BookingsView from './views/BookingsView'
import ConverterView from './views/ConverterView'
import DayView from './views/DayView'
import EmergencyView from './views/EmergencyView'
import ExpensesView from './views/ExpensesView'
import GuideView from './views/GuideView'
import NearbyView from './views/NearbyView'
import IdeasView from './views/IdeasView'
import RouteView from './views/RouteView'
import TranslatorView from './views/TranslatorView'
import TripList from './views/TripList'
import TripView from './views/TripView'
import VoiceTestView from './views/VoiceTestView'

export default function App() {
  const { language, setLanguage, t } = useLanguage()
  const { data, damaged, saveFailed, update } = useStore()
  const route = useRoute()

  const trip = data.trips.find((candidate) => candidate.id === route.tripId)

  function changeTrip(id: string, change: (trip: Trip) => Trip) {
    update((current) => {
      const existing = current.trips.find((candidate) => candidate.id === id)
      if (!existing) return current
      const changed = { ...change(existing), updatedAt: new Date().toISOString() }
      return { ...current, trips: upsert(current.trips, changed) }
    })
  }

  function page() {
    // « convert » ne peut pas être confondu avec l'identifiant d'un voyage.
    if (route.tripId === 'convert') return <ConverterView t={t} language={language} />
    if (route.tripId === 'nearby') return <NearbyView t={t} language={language} />
    if (route.tripId === 'voice') return <VoiceTestView t={t} language={language} />
    if (route.tripId === 'guide') return <GuideView t={t} language={language} />
    if (route.tripId === 'translate') return <TranslatorView t={t} language={language} />
    if (route.tripId === 'emergency') {
      return <EmergencyView t={t} language={language} onCountry={() => {}} />
    }
    if (trip && route.date === 'emergency') {
      return (
        <EmergencyView
          key={trip.id}
          t={t}
          language={language}
          trip={trip}
          onCountry={(country) => changeTrip(trip.id, (current) => ({ ...current, country }))}
        />
      )
    }
    if (!route.tripId) {
      return <TripList t={t} language={language} data={data} update={update} />
    }
    if (trip && !route.date) {
      return (
        <TripView
          key={trip.id}
          t={t}
          language={language}
          trip={trip}
          onChange={(change) => changeTrip(trip.id, change)}
          onDelete={() => {
            update((current) => ({
              ...current,
              trips: current.trips.filter((candidate) => candidate.id !== trip.id),
            }))
            deleteFiles(fileIds([trip])).catch(() => {})
            window.location.hash = link()
          }}
        />
      )
    }
    if (trip && route.date === 'route') {
      return (
        <RouteView
          key={trip.id}
          t={t}
          language={language}
          trip={trip}
          onChange={(change) => changeTrip(trip.id, change)}
        />
      )
    }
    if (trip && route.date === 'ideas') {
      const days = listDays(trip.startDate, trip.endDate)
      return (
        <IdeasView
          key={trip.id}
          t={t}
          language={language}
          trip={trip}
          date={route.extra && days.includes(route.extra) ? route.extra : undefined}
          onChange={(change) => changeTrip(trip.id, change)}
        />
      )
    }
    if (trip && route.date === 'bookings') {
      return (
        <BookingsView
          key={trip.id}
          t={t}
          language={language}
          trip={trip}
          onChange={(change) => changeTrip(trip.id, change)}
        />
      )
    }
    if (trip && route.date === 'expenses') {
      return (
        <ExpensesView
          key={trip.id}
          t={t}
          language={language}
          trip={trip}
          onChange={(change) => changeTrip(trip.id, change)}
        />
      )
    }
    if (trip && route.date && listDays(trip.startDate, trip.endDate).includes(route.date)) {
      return (
        <DayView
          key={`${trip.id}/${route.date}`}
          t={t}
          language={language}
          trip={trip}
          date={route.date}
          onChange={(change) => changeTrip(trip.id, change)}
        />
      )
    }
    return (
      <p className="card">
        {t.notFound} <a href={link()}>{t.myTrips}</a>
      </p>
    )
  }

  return (
    <>
      <header>
        <a className="brand" href={link()}>
          <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" width="56" height="56" />
          <div>
            <h1>MezTravel</h1>
            <p>{t.tagline}</p>
          </div>
        </a>
        <div className="languages" role="group" aria-label={t.languageLabel}>
          {languages.map((code) => (
            <button
              key={code}
              type="button"
              aria-pressed={code === language}
              onClick={() => setLanguage(code)}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <main>
        {saveFailed && (
          <p className="card warning" role="alert">
            {t.saveFailed}
          </p>
        )}
        {damaged ? (
          <div className="card warning" role="alert">
            <p>{t.damaged}</p>
            <button type="button" onClick={() => saveFile('meztravel-damaged.json', rawStoredData())}>
              {t.damagedDownload}
            </button>
          </div>
        ) : (
          page()
        )}
      </main>
    </>
  )
}
