import { useState, type FormEvent } from 'react'
import BookingCard, { addToCalendar } from '../components/BookingCard'
import BookingForm from '../components/BookingForm'
import PdfViewer from '../components/PdfViewer'
import { deleteFiles } from '../fileStore'
import { formatDate, type Dictionary, type Language } from '../i18n'
import { link } from '../route'
import { isDate, today, upsert, type Booking, type Todo, type Trip } from '../trips'

type Props = {
  t: Dictionary
  language: Language
  trip: Trip
  onChange: (change: (trip: Trip) => Trip) => boolean
}

export default function BookingsView({ t, language, trip, onChange }: Props) {
  const [draft, setDraft] = useState<Booking | null>(null)
  const [viewing, setViewing] = useState<{ id: string; name: string } | null>(null)
  const [todoText, setTodoText] = useState('')
  const [todoDate, setTodoDate] = useState('')

  const bookings = [...(trip.bookings ?? [])].sort((a, b) =>
    `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
  )
  // À faire d'abord, par échéance ; sans échéance ensuite.
  const todos = [...(trip.todos ?? [])].sort(
    (a, b) =>
      Number(a.done) - Number(b.done) || (a.dueDate || '9999').localeCompare(b.dueDate || '9999'),
  )
  const isNew = draft !== null && !bookings.some((b) => b.id === draft.id)

  function save(booking: Booking) {
    const previous = bookings.find((b) => b.id === booking.id)?.file
    const saved = onChange((current) => ({
      ...current,
      bookings: upsert(current.bookings ?? [], booking),
    }))
    // L'ancien PDF n'est supprimé qu'après l'enregistrement du nouveau.
    if (saved && previous && previous.id !== booking.file?.id) {
      deleteFiles([previous.id]).catch(() => {})
    }
    setDraft(null)
  }

  function remove(booking: Booking) {
    if (!window.confirm(t.confirmDeleteBooking)) return
    const saved = onChange((current) => ({
      ...current,
      bookings: (current.bookings ?? []).filter((b) => b.id !== booking.id),
    }))
    if (saved && booking.file) deleteFiles([booking.file.id]).catch(() => {})
  }

  const setTodos = (change: (list: Todo[]) => Todo[]) =>
    onChange((current) => ({ ...current, todos: change(current.todos ?? []) }))

  function addTodo(event: FormEvent) {
    event.preventDefault()
    const text = todoText.trim()
    if (!text) return
    if (todoDate && !isDate(todoDate)) return setTodoDate('')
    const todo = { id: crypto.randomUUID(), text, dueDate: todoDate, done: false }
    setTodos((list) => [...list, todo])
    setTodoText('')
    setTodoDate('')
  }

  return (
    <>
      <a className="back" href={link(trip.id)}>
        ‹ {trip.name}
      </a>
      <h2 className="page-title">{t.bookingsTitle}</h2>

      {draft ? (
        <BookingForm
          key={draft.id}
          t={t}
          language={language}
          trip={trip}
          booking={draft}
          isNew={isNew}
          onSave={save}
          onCancel={() => setDraft(null)}
        />
      ) : (
        <>
          {bookings.length === 0 && <p className="card">{t.noBookings}</p>}
          {bookings.map((booking) => (
            <BookingCard
              key={booking.id}
              t={t}
              language={language}
              booking={booking}
              onOpenPdf={setViewing}
            >
              <button type="button" onClick={() => setDraft(booking)}>
                {t.edit}
              </button>
              <button type="button" onClick={() => remove(booking)}>
                {t.remove}
              </button>
            </BookingCard>
          ))}
          <button
            type="button"
            className="primary wide"
            onClick={() =>
              setDraft({
                id: crypto.randomUUID(),
                type: 'stay',
                title: '',
                date: '',
                time: '',
                endDate: '',
                endTime: '',
                notes: '',
              })
            }
          >
            + {t.addBooking}
          </button>
          <p className="muted calendar-note">{t.calendarNote}</p>
        </>
      )}

      <section className="card">
        <h2>{t.todosTitle}</h2>
        {todos.length === 0 && <p>{t.noTodos}</p>}
        <ul className="plain">
          {todos.map((todo) => (
            <li key={todo.id} className="todo">
              <div className="item">
                <label className={todo.done ? 'done' : undefined}>
                  <input
                    type="checkbox"
                    checked={todo.done}
                    onChange={() => setTodos((list) => upsert(list, { ...todo, done: !todo.done }))}
                  />
                  {todo.text}
                </label>
                <button
                  type="button"
                  aria-label={`${t.remove}: ${todo.text}`}
                  onClick={() => setTodos((list) => list.filter((x) => x.id !== todo.id))}
                >
                  ✕
                </button>
              </div>
              {todo.dueDate && (
                <p className="muted">
                  {!todo.done && todo.dueDate < today() && (
                    <strong className="error">{t.overdue} · </strong>
                  )}
                  {t.dueBy} {formatDate(todo.dueDate, language, true)}
                </p>
              )}
              {todo.dueDate && !todo.done && (
                <button
                  type="button"
                  onClick={() =>
                    addToCalendar('meztravel', [
                      {
                        uid: todo.id,
                        title: `${t.toBook}: ${todo.text}`,
                        date: todo.dueDate,
                        time: '',
                        description: trip.name,
                      },
                    ])
                  }
                >
                  {t.toCalendar}
                </button>
              )}
            </li>
          ))}
        </ul>
        <form onSubmit={addTodo} className="todo-form">
          <label>
            {t.todoWhat}
            <input value={todoText} onChange={(e) => setTodoText(e.target.value)} />
          </label>
          <label>
            {t.todoDue}
            <input type="date" value={todoDate} onChange={(e) => setTodoDate(e.target.value)} />
          </label>
          <button type="submit" className="primary wide">
            {t.add}
          </button>
        </form>
      </section>

      {viewing && <PdfViewer t={t} file={viewing} onClose={() => setViewing(null)} />}
    </>
  )
}
