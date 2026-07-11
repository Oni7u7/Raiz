import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// No hacemos throw aquí: un throw a nivel de módulo pasa ANTES de que
// React monte nada, así que la página queda en blanco sin ningún
// mensaje visible. En vez de eso, exponemos esta bandera y main.tsx
// decide qué renderizar (la app real, o una pantalla explicando qué
// falta configurar).
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = createClient<Database>(
  supabaseUrl || 'https://missing-config.supabase.co',
  supabaseAnonKey || 'missing-config'
)
