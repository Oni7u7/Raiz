// Chatbot de IA para participantes y anfitriones. Se despliega CON
// verificación de JWT activada (a diferencia de anchor-review/confirm-anchors,
// que corren --no-verify-jwt porque solo las llama el sistema interno de
// Supabase) — sin sesión válida, Supabase rechaza la petición antes de que
// corra una sola línea de este archivo.
//
// Reglas de seguridad no negociables de este archivo:
// - Nunca se usa SUPABASE_SERVICE_ROLE_KEY. Todo corre contra un cliente de
//   Supabase creado por request, con el JWT del usuario que llama — RLS
//   decide qué puede leer, igual que si la consulta viniera del frontend.
// - El rol (participante/anfitrión) nunca se confía del body del request:
//   se consulta `profiles.role` con el cliente ya scoped al usuario
//   verificado, y ESE rol decide qué tools y qué system prompt se usan.
// - Ninguna tool escribe en la base de datos. `propose_add_restriction` es
//   puramente estructural: arma un `suggested_action` en la respuesta para
//   que el frontend muestre un botón — la escritura real la hace el usuario
//   confirmando en la UI normal, reusando el código que ya existe ahí.
import { createClient } from 'npm:@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk@0.111.0'
import { hostTools, executeHostTool } from './tools-host.ts'
import { participantTools, executeParticipantTool } from './tools-participant.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

const DAILY_MESSAGE_LIMIT = 30
const MAX_TOOL_ITERATIONS = 5
const MAX_HISTORY_TURNS = 10

const HOST_SYSTEM_PROMPT = `Eres el asistente de anfitriones de Raíz, una plataforma de experiencias/eventos.
Ayudas al anfitrión con: consultar sus eventos, ver reservas y resúmenes de un evento (reservas por estado,
reviews), y dar consejo general de logística, precios y diseño de experiencias. Respondes en español, breve
y concreto. Nunca inventes datos: si necesitas información real, usa las tools disponibles. No tienes forma
de modificar nada en la base de datos — si el anfitrión pide cambiar algo, dile que lo haga desde su
dashboard.`

const PARTICIPANT_SYSTEM_PROMPT = `Eres el asistente de participantes de Raíz, una plataforma de
experiencias/eventos. Ayudas al participante con: consultar sus reservas, su perfil (solo lectura por
ahora), sus restricciones registradas (dietéticas, médicas, de accesibilidad) y eventos publicados.
Respondes en español, breve y concreto. Nunca inventes datos: si necesitas información real, usa las tools
disponibles.

Si el participante menciona una restricción (alergia, condición médica, necesidad de accesibilidad) que no
aparece en get_my_restrictions, primero usa get_restrictions_catalog para encontrar el ID correspondiente y
luego usa propose_add_restriction — esa tool NO agrega nada, solo hace que aparezca un botón de confirmación
en la pantalla. Nunca digas que ya la agregaste: di que puede confirmarla con el botón.`

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface SuggestedAction {
  type: 'add_restriction'
  restriction_id: string
  label: string
}

type Language = 'es' | 'en'

// El system prompt en sí se queda en un solo idioma (español) para no
// duplicar todo el texto de instrucciones — se le agrega esta directiva al
// final para que Claude responda en el idioma que eligió el usuario en el
// selector de la UI, sin importar en qué idioma le escriban.
function languageDirective(language: Language): string {
  return language === 'en'
    ? '\n\nRespond always in English, regardless of what language the user writes in.'
    : '\n\nResponde siempre en español, sin importar en qué idioma escriba el usuario.'
}

const RATE_LIMIT_MESSAGE: Record<Language, (limit: number) => string> = {
  es: (limit) => `Llegaste a tu límite de ${limit} mensajes por hoy. Vuelve a intentarlo mañana.`,
  en: (limit) => `You've reached your limit of ${limit} messages for today. Please try again tomorrow.`,
}

const MAX_ITERATIONS_MESSAGE: Record<Language, string> = {
  es: 'No pude terminar de procesar tu pregunta, ¿puedes reformularla de forma más simple?',
  en: "I couldn't finish processing your question — could you rephrase it more simply?",
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json({ error: 'Falta autenticación.' }, 401)
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser()

  if (userError || !user) {
    return json({ error: 'Sesión inválida.' }, 401)
  }

  let body: { message?: string; history?: ChatMessage[]; context?: string; language?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'JSON inválido.' }, 400)
  }

  const userMessage = (body.message ?? '').trim()
  if (!userMessage) {
    return json({ error: 'Falta el mensaje.' }, 400)
  }

  const language: Language = body.language === 'en' ? 'en' : 'es'

  const { data: profile, error: profileError } = await userClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return json({ error: 'No se pudo verificar el perfil del usuario.' }, 403)
  }

  const role = profile.role as 'anfitrion' | 'participante'

  const limitError = await checkAndIncrementRateLimit(userClient, user.id, language)
  if (limitError) {
    return json({ reply: limitError }, 200)
  }

  const tools = role === 'anfitrion' ? hostTools : participantTools
  const systemPrompt =
    (role === 'anfitrion'
      ? withContext(HOST_SYSTEM_PROMPT, body.context)
      : withContext(PARTICIPANT_SYSTEM_PROMPT, body.context)) + languageDirective(language)

  const history = (body.history ?? []).slice(-MAX_HISTORY_TURNS)
  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content }) as Anthropic.MessageParam),
    { role: 'user', content: userMessage },
  ]

  let suggestedAction: SuggestedAction | null = null

  try {
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-5',
        max_tokens: 1024,
        output_config: { effort: 'low' },
        system: systemPrompt,
        tools,
        messages,
      })

      if (response.stop_reason !== 'tool_use') {
        const reply = extractText(response.content)
        return json({ reply, suggested_action: suggestedAction })
      }

      messages.push({ role: 'assistant', content: response.content })

      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      )

      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const block of toolUseBlocks) {
        if (block.name === 'propose_add_restriction') {
          const input = block.input as { restriction_id: string; label: string }
          suggestedAction = { type: 'add_restriction', restriction_id: input.restriction_id, label: input.label }
        }

        const result =
          role === 'anfitrion'
            ? await executeHostTool(block.name, block.input as Record<string, unknown>, { userClient, userId: user.id })
            : await executeParticipantTool(block.name, block.input as Record<string, unknown>, {
                userClient,
                userId: user.id,
              })

        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) })
      }

      messages.push({ role: 'user', content: toolResults })
    }

    // Se llegó al tope de iteraciones sin que el modelo cerrara el turno.
    return json({
      reply: MAX_ITERATIONS_MESSAGE[language],
      suggested_action: suggestedAction,
    })
  } catch (error) {
    console.error('Error llamando a Claude:', error)
    return json({ error: 'Ocurrió un error hablando con el asistente. Intenta de nuevo en un momento.' }, 502)
  }
})

function withContext(systemPrompt: string, context?: string): string {
  if (!context) return systemPrompt
  return `${systemPrompt}\n\nContexto adicional de la pantalla actual: ${context}`
}

function extractText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()
}

// deno-lint-ignore no-explicit-any
async function checkAndIncrementRateLimit(
  userClient: any,
  userId: string,
  language: Language,
): Promise<string | null> {
  const today = new Date().toISOString().slice(0, 10)

  const { data: existing } = await userClient
    .from('chat_usage')
    .select('message_count')
    .eq('user_id', userId)
    .eq('usage_date', today)
    .maybeSingle()

  if (!existing) {
    await userClient.from('chat_usage').insert({ user_id: userId, usage_date: today, message_count: 1 })
    return null
  }

  if (existing.message_count >= DAILY_MESSAGE_LIMIT) {
    return RATE_LIMIT_MESSAGE[language](DAILY_MESSAGE_LIMIT)
  }

  await userClient
    .from('chat_usage')
    .update({ message_count: existing.message_count + 1 })
    .eq('user_id', userId)
    .eq('usage_date', today)

  return null
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
