// Tools de solo lectura para el chatbot del participante, más una tool
// puramente estructural (`propose_add_restriction`) que NO toca la base de
// datos: solo le indica a index.ts que arme un `suggested_action` en la
// respuesta HTTP para que el frontend muestre un botón de confirmación. La
// escritura real ocurre después, cuando el usuario hace clic, reusando la
// misma lógica que ya existe en ParticipantDashboard.tsx — el modelo nunca
// inserta nada directamente.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export interface ToolContext {
  userClient: SupabaseClient
  userId: string
}

export const participantTools = [
  {
    name: 'get_restrictions_catalog',
    description: 'Lista el catálogo completo de restricciones disponibles (dietéticas, médicas, de accesibilidad, otras).',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'get_my_restrictions',
    description: 'Lista las restricciones que el participante que está chateando ya tiene registradas en su perfil.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'get_my_profile',
    description: 'Trae los datos de perfil del participante que está chateando (nombre, teléfono, contacto de emergencia, notas). Solo lectura.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'get_published_events',
    description: 'Lista eventos publicados (públicos), opcionalmente filtrados por texto en el título o la descripción.',
    input_schema: {
      type: 'object' as const,
      properties: {
        search: { type: 'string', description: 'Texto a buscar en título/descripción. Opcional.' },
      },
    },
  },
  {
    name: 'get_my_bookings',
    description: 'Lista las reservas del participante que está chateando, con los datos del evento correspondiente.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'propose_add_restriction',
    description:
      'Propone agregar una restricción al perfil del participante. NO la agrega — solo hace que el frontend muestre un botón de confirmación. Úsala cuando el usuario mencione una restricción (alergia, condición médica, necesidad de accesibilidad) que no aparece en get_my_restrictions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        restriction_id: { type: 'string', description: 'ID de la restricción del catálogo (usa get_restrictions_catalog primero).' },
        label: { type: 'string', description: 'Nombre legible de la restricción, para mostrar en el botón.' },
      },
      required: ['restriction_id', 'label'],
    },
  },
]

export async function executeParticipantTool(name: string, input: Record<string, unknown>, ctx: ToolContext) {
  const { userClient, userId } = ctx

  if (name === 'get_restrictions_catalog') {
    const { data, error } = await userClient.from('restrictions').select('*').order('name')
    if (error) return { error: error.message }
    return { restrictions: data }
  }

  if (name === 'get_my_restrictions') {
    const { data, error } = await userClient
      .from('participant_restrictions')
      .select('*, restrictions(*)')
      .eq('participant_id', userId)
    if (error) return { error: error.message }
    return { restrictions: data }
  }

  if (name === 'get_my_profile') {
    const [profileRes, participantRes] = await Promise.all([
      userClient.from('profiles').select('*').eq('id', userId).maybeSingle(),
      userClient.from('participants').select('*').eq('id', userId).maybeSingle(),
    ])
    if (profileRes.error) return { error: profileRes.error.message }
    if (participantRes.error) return { error: participantRes.error.message }
    return { profile: profileRes.data, participant: participantRes.data }
  }

  if (name === 'get_published_events') {
    let query = userClient.from('events').select('*').eq('status', 'publicado').order('start_date')
    const search = typeof input.search === 'string' ? input.search.trim() : ''
    if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    const { data, error } = await query
    if (error) return { error: error.message }
    return { events: data }
  }

  if (name === 'get_my_bookings') {
    const { data, error } = await userClient
      .from('bookings')
      .select('*, events(*)')
      .eq('participant_id', userId)
      .order('created_at', { ascending: false })
    if (error) return { error: error.message }
    return { bookings: data }
  }

  if (name === 'propose_add_restriction') {
    // Estructural: no toca la base de datos. index.ts intercepta este
    // tool_use específico para armar el `suggested_action` de la respuesta.
    return { presented_to_user: true }
  }

  return { error: `Tool desconocida: ${name}` }
}
