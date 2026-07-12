import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { AddressAutocompleteField } from '../../components/AddressAutocompleteField'
import type { EventStatus } from '../../types/database'

const ACCESSIBILITY_OPTIONS = [
  'Camino plano / sin escalones',
  'Terreno irregular',
  'Rampas disponibles',
  'Baños accesibles',
  'Apoyo para visión (baja visión/ciegos)',
  'Apoyo para audición (sordera/hipoacusia)',
  'Asientos disponibles',
  'Estacionamiento accesible',
]

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
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [capacity, setCapacity] = useState('')
  const [price, setPrice] = useState('')
  const [selectedAccessibility, setSelectedAccessibility] = useState<Set<string>>(new Set())
  const [otroChecked, setOtroChecked] = useState(false)
  const [otroText, setOtroText] = useState('')
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
        setLatitude(data.latitude)
        setLongitude(data.longitude)
        setStartDate(toDatetimeLocal(data.start_date))
        setEndDate(toDatetimeLocal(data.end_date))
        setCapacity(data.capacity != null ? String(data.capacity) : '')
        setPrice(data.price != null ? String(data.price) : '')

        const matched = new Set(data.accessibility_features.filter((f) => ACCESSIBILITY_OPTIONS.includes(f)))
        const leftover = data.accessibility_features.filter((f) => !ACCESSIBILITY_OPTIONS.includes(f))
        setSelectedAccessibility(matched)
        if (leftover.length > 0) {
          setOtroChecked(true)
          setOtroText(leftover.join(', '))
        }

        setStatus(data.status)
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [id, isEditing])

  function toggleAccessibility(option: string) {
    setSelectedAccessibility((prev) => {
      const next = new Set(prev)
      if (next.has(option)) next.delete(option)
      else next.add(option)
      return next
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const accessibilityFeatures = [
      ...selectedAccessibility,
      ...(otroChecked && otroText.trim() ? [otroText.trim()] : []),
    ]

    const payload = {
      title,
      description: description || null,
      location: location || null,
      latitude,
      longitude,
      start_date: new Date(startDate).toISOString(),
      end_date: endDate ? new Date(endDate).toISOString() : null,
      capacity: capacity ? Number(capacity) : null,
      price: price ? Number(price) : null,
      accessibility_features: accessibilityFeatures,
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
            <label htmlFor="location">Dirección</label>
            <AddressAutocompleteField
              value={location}
              latitude={latitude}
              longitude={longitude}
              onChange={(next) => {
                setLocation(next.address)
                setLatitude(next.latitude)
                setLongitude(next.longitude)
              }}
            />
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
            <label>Accesibilidad</label>
            <div className="field-checkboxes">
              {ACCESSIBILITY_OPTIONS.map((option) => (
                <label key={option} className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={selectedAccessibility.has(option)}
                    onChange={() => toggleAccessibility(option)}
                  />
                  {option}
                </label>
              ))}
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={otroChecked}
                  onChange={(e) => setOtroChecked(e.target.checked)}
                />
                Otro
              </label>
              {otroChecked && (
                <input
                  className="checkbox-option-detail"
                  placeholder="Detalla la accesibilidad adicional"
                  value={otroText}
                  onChange={(e) => setOtroText(e.target.value)}
                />
              )}
            </div>
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
