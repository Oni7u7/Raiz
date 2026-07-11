import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import type { Database } from '../../types/database'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadAll() {
    const [bookingsRes, myRestrictionsRes, catalogRes] = await Promise.all([
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
    ])

    if (bookingsRes.error) setError(bookingsRes.error.message)
    else setBookings(bookingsRes.data as BookingRow[])

    if (myRestrictionsRes.error) setError(myRestrictionsRes.error.message)
    else setMyRestrictions(myRestrictionsRes.data as ParticipantRestrictionRow[])

    if (catalogRes.error) setError(catalogRes.error.message)
    else setCatalog(catalogRes.data ?? [])

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
          {bookings.map((b) => (
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
            </li>
          ))}
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
    </div>
  )
}
