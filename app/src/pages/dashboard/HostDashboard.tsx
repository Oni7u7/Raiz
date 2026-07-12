import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import type { BookingStatus, Database } from '../../types/database'
import { ChatWidget } from '../../components/ChatWidget'

type EventRow = Database['public']['Tables']['events']['Row']
type BookingRow = Database['public']['Tables']['bookings']['Row']
type ReviewRow = Database['public']['Tables']['reviews']['Row']
type ReviewAnchorRow = Database['public']['Tables']['review_anchors']['Row']

const BOOKING_STATUSES: BookingStatus[] = [
  'pendiente',
  'confirmado',
  'cancelado',
  'asistio',
  'no_asistio',
]

export function HostDashboard() {
  const { session } = useAuth()
  const hostId = session!.user.id

  const [events, setEvents] = useState<EventRow[]>([])
  const [bookingsByEvent, setBookingsByEvent] = useState<Record<string, BookingRow[]>>({})
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [anchorByReview, setAnchorByReview] = useState<Record<string, ReviewAnchorRow>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadAll() {
    const eventsRes = await supabase
      .from('events')
      .select('*')
      .eq('host_id', hostId)
      .order('start_date', { ascending: false })

    if (eventsRes.error) {
      setError(eventsRes.error.message)
      setLoading(false)
      return
    }

    const eventRows = eventsRes.data ?? []
    setEvents(eventRows)

    const eventIds = eventRows.map((e) => e.id)

    const [bookingsRes, reviewsRes] = await Promise.all([
      eventIds.length
        ? supabase.from('bookings').select('*').in('event_id', eventIds)
        : Promise.resolve({ data: [] as BookingRow[], error: null }),
      supabase.from('reviews').select('*').eq('host_id', hostId).order('created_at', { ascending: false }),
    ])

    if (bookingsRes.error) setError(bookingsRes.error.message)
    else {
      const grouped: Record<string, BookingRow[]> = {}
      for (const b of bookingsRes.data ?? []) {
        grouped[b.event_id] ??= []
        grouped[b.event_id].push(b)
      }
      setBookingsByEvent(grouped)
    }

    if (reviewsRes.error) setError(reviewsRes.error.message)
    else {
      const reviewRows = reviewsRes.data ?? []
      setReviews(reviewRows)

      const reviewIds = reviewRows.map((r) => r.id)
      if (reviewIds.length) {
        const { data: anchors } = await supabase
          .from('review_anchors')
          .select('*')
          .in('review_id', reviewIds)

        const grouped: Record<string, ReviewAnchorRow> = {}
        for (const a of anchors ?? []) grouped[a.review_id] = a
        setAnchorByReview(grouped)
      }
    }

    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function updateBookingStatus(bookingId: string, status: BookingStatus) {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', bookingId)
    if (error) {
      setError(error.message)
      return
    }
    await loadAll()
  }

  if (loading) return <p className="loading">Cargando…</p>

  return (
    <div className="dashboard">
      <div className="masthead">
        <div className="mh-l">
          <span className="kicker">Anfitrión</span>
          <h1>Mi dashboard</h1>
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}

      <div className="dashboard-actions">
        <Link to="/dashboard/anfitrion/eventos/nuevo" className="btn btn-solid">
          + Nuevo evento
        </Link>
      </div>

      <section>
        <div className="masthead">
          <div className="mh-l">
            <span className="kicker">Publicaciones</span>
            <h2>Mis eventos</h2>
          </div>
        </div>
        {events.length === 0 && <p>Aún no has publicado eventos.</p>}
        {events.map((event) => (
          <article key={event.id} className="host-event-card">
            <header>
              <h3>{event.title}</h3>
              <span className={`status status-${event.status}`}>{event.status}</span>
              <Link to={`/dashboard/anfitrion/eventos/${event.id}/editar`}>Editar</Link>
            </header>
            <p>{new Date(event.start_date).toLocaleString('es-MX')}</p>

            <h4>Reservas</h4>
            <ul>
              {(bookingsByEvent[event.id] ?? []).length === 0 && <li>Sin reservas.</li>}
              {(bookingsByEvent[event.id] ?? []).map((b) => (
                <li key={b.id}>
                  {b.form_data && typeof b.form_data === 'object' && 'notas' in b.form_data
                    ? String((b.form_data as { notas?: string }).notas ?? '(sin notas)')
                    : '(sin notas)'}
                  {' — '}
                  <select
                    value={b.status}
                    onChange={(e) => updateBookingStatus(b.id, e.target.value as BookingStatus)}
                  >
                    {BOOKING_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section>
        <div className="masthead">
          <div className="mh-l">
            <span className="kicker">Reputación</span>
            <h2>Reviews recibidas</h2>
          </div>
        </div>
        {reviews.length === 0 && <p>Todavía no tienes reviews.</p>}
        <ul>
          {reviews.map((r) => {
            const anchor = anchorByReview[r.id]
            return (
              <li key={r.id}>
                {'★'.repeat(r.rating)} {r.comment}
                {anchor?.status === 'confirmado' && anchor.tx_hash && (
                  <a
                    href={`https://sepolia.etherscan.io/tx/${anchor.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Verificado en blockchain (Sepolia)"
                    className="verified-badge"
                  >
                    ✓
                  </a>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <ChatWidget role="anfitrion" />
    </div>
  )
}
