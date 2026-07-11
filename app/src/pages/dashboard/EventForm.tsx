import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import type { EventStatus } from '../../types/database'

function toDatetimeLocal(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function EventForm() {
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const { session } = useAuth()
  const hostId = session!.user.id

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [capacity, setCapacity] = useState('')
  const [price, setPrice] = useState('')
  const [accessibilityFeatures, setAccessibilityFeatures] = useState('')
  const [status, setStatus] = useState<EventStatus>('borrador')

  const [loading, setLoading] = useState(isEditing)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEditing) return
    let active = true

    supabase
      .from('events')
      .select('*')
      .eq('id', id as string)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        if (error || !data) {
          setError(error?.message ?? 'Evento no encontrado')
          setLoading(false)
          return
        }
        setTitle(data.title)
        setDescription(data.description ?? '')
        setLocation(data.location ?? '')
        setStartDate(toDatetimeLocal(data.start_date))
        setEndDate(toDatetimeLocal(data.end_date))
        setCapacity(data.capacity != null ? String(data.capacity) : '')
        setPrice(data.price != null ? String(data.price) : '')
        setAccessibilityFeatures(data.accessibility_features.join(', '))
        setStatus(data.status)
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [id, isEditing])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const payload = {
      title,
      description: description || null,
      location: location || null,
      start_date: new Date(startDate).toISOString(),
      end_date: endDate ? new Date(endDate).toISOString() : null,
      capacity: capacity ? Number(capacity) : null,
      price: price ? Number(price) : null,
      accessibility_features: accessibilityFeatures
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean),
      status,
    }

    const { error } = isEditing
      ? await supabase.from('events').update(payload).eq('id', id as string)
      : await supabase.from('events').insert({ ...payload, host_id: hostId })

    setSubmitting(false)

    if (error) {
      setError(error.message)
      return
    }

    navigate('/dashboard/anfitrion')
  }

  if (loading) return <p className="loading">Cargando…</p>

  return (
    <div className="event-form-page">
      <div className="form-card">
        <h1>{isEditing ? 'Editar evento' : 'Nuevo evento'}</h1>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="title">Título</label>
            <input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="description">Descripción</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="location">Lugar</label>
            <input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="field row2">
            <div>
              <label htmlFor="startDate">Fecha y hora de inicio</label>
              <input
                id="startDate"
                type="datetime-local"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="endDate">Fecha y hora de fin</label>
              <input
                id="endDate"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="field row2">
            <div>
              <label htmlFor="capacity">Cupo</label>
              <input
                id="capacity"
                type="number"
                min={0}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="price">Precio</label>
              <input
                id="price"
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="accessibilityFeatures">
              Accesibilidad (separado por comas: rampa, baño adaptado, señas)
            </label>
            <input
              id="accessibilityFeatures"
              value={accessibilityFeatures}
              onChange={(e) => setAccessibilityFeatures(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="status">Estado</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as EventStatus)}
            >
              <option value="borrador">Borrador</option>
              <option value="publicado">Publicado</option>
              <option value="cancelado">Cancelado</option>
              <option value="finalizado">Finalizado</option>
            </select>
          </div>

          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn btn-solid" disabled={submitting}>
            {submitting ? 'Guardando…' : 'Guardar'}
          </button>
        </form>
      </div>
    </div>
  )
}
