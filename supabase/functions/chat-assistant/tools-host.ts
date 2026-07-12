// Tools de solo lectura para el chatbot del anfitrión. Todas corren contra
// el `userClient` pasado en el contexto (cliente de Supabase con el JWT del
// usuario que está chateando) — nunca contra un cliente con service_role,
// así que RLS decide qué filas puede ver, igual que si la consulta viniera
// del frontend. Ninguna de estas tools hace insert/update/delete.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export interface ToolContext {
  userClient: SupabaseClient
  userId: string
}

export const hostTools = [
  {
    name: 'get_my_events',
    description:
      'Lista los eventos publicados por el anfitrión que está chateando. Puede filtrarse por estado (borrador, publicado, cancelado, finalizado).',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          enum: ['borrador', 'publicado', 'cancelado', 'finalizado'],
          description: 'Filtra por estado del evento. Si se omite, trae todos.',
        },
      },
    },
  },
  {
    name: 'get_event_bookings',
    description: 'Trae las reservas (bookings) de un evento específico del anfitrión, con su estado.',
    input_schema: {
      type: 'object' as const,
      properties: {
        event_id: { type: 'string', description: 'ID del evento.' },
      },
      required: ['event_id'],
    },
  },
  {
    name: 'get_event_summary',
    description:
      'Da un resumen de un evento: datos del evento, conteo de reservas por estado, y promedio/conteo de reviews recibidas para ese evento.',
    input_schema: {
      type: 'object' as const,
      properties: {
        event_id: { type: 'string', description: 'ID del evento.' },
      },
      required: ['event_id'],
    },
  },
]

export async function executeHostTool(name: string, input: Record<string, unknown>, ctx: ToolContext) {
  const { userClient, userId } = ctx

  if (name === 'get_my_events') {
    let query = userClient.from('events').select('*').eq('host_id', userId).order('start_date', { ascending: false })
    if (typeof input.status === 'string') query = query.eq('status', input.status)
    const { data, error } = await query
    if (error) return { error: error.message }
    return { events: data }
  }

  if (name === 'get_event_bookings') {
    const eventId = String(input.event_id ?? '')
    const { data, error } = await userClient.from('bookings').select('*').eq('event_id', eventId)
    if (error) return { error: error.message }
    return { bookings: data }
  }

  if (name === 'get_event_summary') {
    const eventId = String(input.event_id ?? '')

    const [eventRes, bookingsRes, reviewsRes] = await Promise.all([
      userClient.from('events').select('*').eq('id', eventId).maybeSingle(),
      userClient.from('bookings').select('status').eq('event_id', eventId),
      userClient.from('reviews').select('rating').eq('event_id', eventId),
    ])

    if (eventRes.error) return { error: eventRes.error.message }
    if (!eventRes.data) return { error: 'Evento no encontrado o no pertenece a este anfitrión.' }

    const bookingsByStatus: Record<string, number> = {}
    for (const b of bookingsRes.data ?? []) {
      bookingsByStatus[b.status] = (bookingsByStatus[b.status] ?? 0) + 1
    }

    const ratings = (reviewsRes.data ?? []).map((r) => r.rating)
    const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null

    return {
      event: eventRes.data,
      bookings_by_status: bookingsByStatus,
      reviews_count: ratings.length,
      reviews_avg_rating: avgRating,
    }
  }

  return { error: `Tool desconocida: ${name}` }
}
