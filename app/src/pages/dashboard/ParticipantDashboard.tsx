import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import type { Database } from '../../types/database'
import { ChatWidget, type SuggestedAction } from '../../components/ChatWidget'

type BookingRow = Database['public']['Tables']['bookings']['Row'] & {
  events: Database['public']['Tables']['events']['Row'] | null
}

type RestrictionRow = Database['public']['Tables']['restrictions']['Row']
type ParticipantRestrictionRow = Database['public']['Tables']['participant_restrictions']['Row'] & {
  restrictions: RestrictionRow | null
}

export function ParticipantDashboard() {
  const { session } = useAuth()
  const participantId = session!.user.id

  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [myRestrictions, setMyRestrictions] = useState<ParticipantRestrictionRow[]>([])
  const [catalog, setCatalog] = useState<RestrictionRow[]>([])
  const [reviewedEventIds, setReviewedEventIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [reviewFormBookingId, setReviewFormBookingId] = useState<string | null>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  async function loadAll() {
    const [bookingsRes, myRestrictionsRes, catalogRes, myReviewsRes] = await Promise.all([
      supabase
        .from('bookings')
        .select('*, events(*)')
        .eq('participant_id', participantId)
        .order('created_at', { ascending: false }),
      supabase
        .from('participant_restrictions')
        .select('*, restrictions(*)')
        .eq('participant_id', participantId),
      supabase.from('restrictions').select('*').order('name'),
      supabase.from('reviews').select('event_id').eq('participant_id', participantId),
    ])

    if (bookingsRes.error) setError(bookingsRes.error.message)
    else setBookings(bookingsRes.data as BookingRow[])

    if (myRestrictionsRes.error) setError(myRestrictionsRes.error.message)
    else setMyRestrictions(myRestrictionsRes.data as ParticipantRestrictionRow[])

    if (catalogRes.error) setError(catalogRes.error.message)
    else setCatalog(catalogRes.data ?? [])

    if (myReviewsRes.error) setError(myReviewsRes.error.message)
    else setReviewedEventIds(new Set((myReviewsRes.data ?? []).map((r) => r.event_id)))

    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function toggleRestriction(restrictionId: string, checked: boolean) {
    if (checked) {
      const { error } = await supabase
        .from('participant_restrictions')
        .insert({ participant_id: participantId, restriction_id: restrictionId })
      if (error) {
        setError(error.message)
        return
      }
    } else {
      const { error } = await supabase
        .from('participant_restrictions')
        .delete()
        .eq('participant_id', participantId)
        .eq('restriction_id', restrictionId)
      if (error) {
        setError(error.message)
        return
      }
    }
    await loadAll()
  }

  async function cancelBooking(bookingId: string) {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelado' })
      .eq('id', bookingId)
    if (error) {
      setError(error.message)
      return
    }
    await loadAll()
  }

  function openReviewForm(bookingId: string) {
    setReviewFormBookingId(bookingId)
    setReviewRating(5)
    setReviewComment('')
    setReviewError(null)
  }

  function closeReviewForm() {
    setReviewFormBookingId(null)
    setReviewError(null)
  }

  async function submitReview(e: FormEvent, booking: BookingRow) {
    e.preventDefault()
    if (!booking.events) return
    setReviewSubmitting(true)
    setReviewError(null)

    const { error } = await supabase.from('reviews').insert({
      event_id: booking.event_id,
      participant_id: participantId,
      host_id: booking.events.host_id,
      rating: reviewRating,
      comment: reviewComment || null,
    })

    setReviewSubmitting(false)

    if (error) {
      if (error.code === '23505') {
        setReviewError('Ya dejaste una reseña para este evento.')
      } else {
        setReviewError(error.message)
      }
      return
    }

    setReviewFormBookingId(null)
    await loadAll()
  }

  async function handleSuggestedAction(action: SuggestedAction) {
    if (action.type === 'add_restriction') {
      await toggleRestriction(action.restriction_id, true)
    }
  }

  if (loading) return <p className="loading">Cargando…</p>

  const myRestrictionIds = new Set(myRestrictions.map((r) => r.restriction_id))

  return (
    <div className="dashboard">
      <div className="masthead">
        <div className="mh-l">
          <span className="kicker">Participante</span>
          <h1>Mi dashboard</h1>
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}

      <section>
        <div className="masthead">
          <div className="mh-l">
            <span className="kicker">Inscripciones</span>
            <h2>Mis reservas</h2>
          </div>
        </div>
        {bookings.length === 0 && (
          <p>
            Aún no tienes reservas. <Link to="/eventos">Ver eventos</Link>
          </p>
        )}
        <ul>
          {bookings.map((b) => {
            const alreadyReviewed = reviewedEventIds.has(b.event_id)
            const showReviewButton = b.status === 'asistio' && !alreadyReviewed
            const showReviewForm = reviewFormBookingId === b.id

            return (
              <li key={b.id}>
                <strong>{b.events?.title ?? 'Evento eliminado'}</strong>
                {' — '}
                {b.events && new Date(b.events.start_date).toLocaleString('es-MX')}
                {' — estado: '}
                <span className={`status status-${b.status}`}>{b.status}</span>
                {b.status !== 'cancelado' && (
                  <button type="button" className="btn" onClick={() => cancelBooking(b.id)}>
                    Cancelar
                  </button>
                )}
                {b.status === 'en_espera' && (
                  <p className="waitlist-note">
                    Estás en lista de espera — te avisaremos si se libera un lugar.
                  </p>
                )}
                {showReviewButton && !showReviewForm && (
                  <button type="button" className="btn" onClick={() => openReviewForm(b.id)}>
                    Dejar reseña
                  </button>
                )}
                {b.status === 'asistio' && alreadyReviewed && (
                  <span className="review-done">Ya dejaste tu reseña ✓</span>
                )}
                {showReviewForm && (
                  <form className="review-form" onSubmit={(e) => submitReview(e, b)}>
                    <div className="field">
                      <label htmlFor={`rating-${b.id}`}>Calificación</label>
                      <select
                        id={`rating-${b.id}`}
                        value={reviewRating}
                        onChange={(e) => setReviewRating(Number(e.target.value))}
                      >
                        {[5, 4, 3, 2, 1].map((n) => (
                          <option key={n} value={n}>
                            {'★'.repeat(n)} ({n})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor={`comment-${b.id}`}>Comentario (opcional)</label>
                      <textarea
                        id={`comment-${b.id}`}
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                      />
                    </div>
                    {reviewError && <p className="form-error">{reviewError}</p>}
                    <div className="review-form-actions">
                      <button type="submit" className="btn btn-solid" disabled={reviewSubmitting}>
                        {reviewSubmitting ? 'Enviando…' : 'Enviar reseña'}
                      </button>
                      <button type="button" className="btn" onClick={closeReviewForm}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <section>
        <div className="masthead">
          <div className="mh-l">
            <span className="kicker">Perfil</span>
            <h2>Mis restricciones</h2>
          </div>
        </div>
        <p className="lede" style={{ marginBottom: '1rem' }}>
          Marca las que apliquen (dietéticas, médicas, de accesibilidad).
        </p>
        <div className="chips restrictions-catalog">
          {catalog.map((r) => (
            <button
              key={r.id}
              type="button"
              className="chip"
              aria-pressed={myRestrictionIds.has(r.id)}
              onClick={() => toggleRestriction(r.id, !myRestrictionIds.has(r.id))}
            >
              {r.name} <span className="restriction-type">{r.type}</span>
            </button>
          ))}
        </div>
      </section>

      <ChatWidget role="participante" onConfirmAction={handleSuggestedAction} />
    </div>
  )
}
