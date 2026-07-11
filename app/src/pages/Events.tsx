import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import type { Database } from '../types/database'

type EventRow = Database['public']['Tables']['events']['Row'] & {
  hosts: { business_name: string | null } | null
}

export function Events() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      const { data, error } = await supabase
        .from('events')
        .select('*, hosts(business_name)')
        .eq('status', 'publicado')
        .order('start_date', { ascending: true })

      if (!active) return
      if (error) {
        setError(error.message)
      } else {
        setEvents(data as EventRow[])
      }
      setLoading(false)
    }

    load()
    return () => {
      active = false
    }
  }, [])

  if (loading) return <p className="loading">Cargando eventos…</p>
  if (error) return <p className="form-error">{error}</p>

  return (
    <div className="events-page">
      <h1>Eventos</h1>
      {events.length === 0 && <p>No hay eventos publicados por ahora.</p>}
      <ul className="events-list">
        {events.map((event) => (
          <li key={event.id}>
            <Link to={`/eventos/${event.id}`}>
              <h2>{event.title}</h2>
              <p>
                {new Date(event.start_date).toLocaleString('es-MX')}
                {event.location ? ` · ${event.location}` : ''}
              </p>
              {event.hosts?.business_name && <p className="host-name">{event.hosts.business_name}</p>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
