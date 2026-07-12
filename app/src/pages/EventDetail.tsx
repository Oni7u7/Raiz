import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { googleMapsSearchUrl } from '../lib/googleMapsUrl'
import type { BookingStatus, Database } from '../types/database'

type EventRow = Database['public']['Tables']['events']['Row'] & {
  hosts: { business_name: string | null; bio: string | null } | null
}

export function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const { session, profile } = useAuth()

  const [event, setEvent] = useState<EventRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [bookingDone, setBookingDone] = useState(false)
  const [bookingStatus, setBookingStatus] = useState<BookingStatus | null>(null)

  useEffect(() => {
    if (!id) return
    let active = true

    async function load() {
      const { data, error } = await supabase
        .from('events')
        .select('*, hosts(business_name, bio)')
        .eq('id', id as string)
        .maybeSingle()

      if (!active) return
      if (error) setLoadError(error.message)
      else setEvent(data as EventRow | null)
      setLoading(false)
    }

    load()
    return () => {
      active = false
    }
  }, [id])

  async function handleBooking(e: FormEvent) {
    e.preventDefault()
    if (!session || !event) return
    setBookingError(null)
    setSubmitting(true)

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        event_id: event.id,
        participant_id: session.user.id,
        form_data: { notas: notes || null },
      })
      .select()
      .single()

    setSubmitting(false)

    if (error) {
      if (error.code === '23505') {
        setBookingError('Ya estás inscrito en este evento.')
      } else {
        setBookingError(error.message)
      }
      return
    }

    setBookingStatus(data.status)
    setBookingDone(true)
  }

  if (loading) return <p className="loading">Cargando…</p>
  if (loadError) return <p className="form-error">{loadError}</p>
  if (!event) return <p>Evento no encontrado.</p>

  const mapsUrl = googleMapsSearchUrl(event.location, event.latitude, event.longitude)

  return (
    <div className="event-detail">
      <h1>{event.title}</h1>
      <p>{new Date(event.start_date).toLocaleString('es-MX')}</p>
      {event.location && <p>{event.location}</p>}
      {mapsUrl && (
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="map-link">
          Ver en Google Maps →
        </a>
      )}
      {event.description && <p>{event.description}</p>}
      {event.price != null && <p>Precio: ${event.price}</p>}
      {event.capacity != null && <p>Cupo: {event.capacity}</p>}
      {event.accessibility_features.length > 0 && (
        <div className="event-detail-accessibility">
          <span className="kicker">Accesibilidad</span>
          <div className="chips">
            {event.accessibility_features.map((f) => (
              <span key={f} className="chip">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}
      {event.hosts?.business_name && (
        <div className="host-box">
          <strong>{event.hosts.business_name}</strong>
          {event.hosts.bio && <p>{event.hosts.bio}</p>}
        </div>
      )}

      <hr />

      {!session && (
        <p>
          <Link to="/login">Inicia sesión</Link> o <Link to="/registro">regístrate</Link> como
          participante para reservar.
        </p>
      )}

      {session && profile && profile.role !== 'participante' && (
        <p>Solo los participantes pueden reservar eventos.</p>
      )}

      {session && profile?.role === 'participante' && !bookingDone && (
        <form onSubmit={handleBooking}>
          <div className="field">
            <label htmlFor="notes">Notas para el anfitrión (opcional)</label>
            <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {bookingError && <p className="form-error">{bookingError}</p>}
          <button type="submit" className="btn btn-solid" disabled={submitting}>
            {submitting ? 'Reservando…' : 'Reservar'}
          </button>
        </form>
      )}

      {bookingDone && bookingStatus === 'en_espera' && (
        <p>
          Este evento ya alcanzó su cupo — quedaste en lista de espera. Te avisaremos si se libera un
          lugar. Puedes ver su estado en <Link to="/dashboard/participante">tu dashboard</Link>.
        </p>
      )}

      {bookingDone && bookingStatus !== 'en_espera' && (
        <p>
          ¡Listo! Tu reserva quedó registrada. Puedes ver su estado en{' '}
          <Link to="/dashboard/participante">tu dashboard</Link>.
        </p>
      )}
    </div>
  )
}
