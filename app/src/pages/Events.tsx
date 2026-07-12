import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { googleMapsSearchUrl } from '../lib/googleMapsUrl'
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
        {events.map((event) => {
          const mapsUrl = googleMapsSearchUrl(event.location, event.latitude, event.longitude)
          return (
            <li key={event.id}>
              <Link to={`/eventos/${event.id}`} className="card-link">
                <h2>{event.title}</h2>
                <p>
                  {new Date(event.start_date).toLocaleString('es-MX')}
                  {event.location ? ` · ${event.location}` : ''}
                </p>
                {event.hosts?.business_name && <p className="host-name">{event.hosts.business_name}</p>}
                {event.accessibility_features.length > 0 && (
                  <div className="chips">
                    {event.accessibility_features.map((f) => (
                      <span key={f} className="chip">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
              {mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="map-link">
                  Ver en Google Maps →
                </a>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
