// Tipos calcados 1:1 del schema real de Supabase (ver
// supabase/manual_migrations en la raíz del repo y el SQL original
// que definió profiles/hosts/participants/restrictions/
// participant_restrictions/events/bookings/reviews).
//
// No se inventan columnas: si el schema cambia, este archivo se
// actualiza a mano junto con la migración correspondiente.
//
// La forma de cada tabla (Row/Insert/Update/Relationships) sigue el
// shape que espera @supabase/postgrest-js (GenericSchema/GenericTable)
// para que el cliente tipado infiera bien los selects/inserts.

export type UserRole = 'anfitrion' | 'participante'
export type RestrictionType = 'dietetica' | 'medica' | 'accesibilidad' | 'otra'
export type EventStatus = 'borrador' | 'publicado' | 'cancelado' | 'finalizado'
export type BookingStatus = 'pendiente' | 'confirmado' | 'cancelado' | 'asistio' | 'no_asistio'
export type AnchorStatus = 'pendiente' | 'confirmado' | 'fallido'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: UserRole
          full_name: string
          phone: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role: UserRole
          full_name: string
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      hosts: {
        Row: {
          id: string
          business_name: string | null
          bio: string | null
          accessibility_offered: string[]
          created_at: string
        }
        Insert: {
          id: string
          business_name?: string | null
          bio?: string | null
          accessibility_offered?: string[]
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['hosts']['Insert']>
        Relationships: []
      }
      participants: {
        Row: {
          id: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['participants']['Insert']>
        Relationships: []
      }
      restrictions: {
        Row: {
          id: string
          type: RestrictionType
          name: string
          description: string | null
        }
        Insert: {
          id?: string
          type: RestrictionType
          name: string
          description?: string | null
        }
        Update: Partial<Database['public']['Tables']['restrictions']['Insert']>
        Relationships: []
      }
      participant_restrictions: {
        Row: {
          participant_id: string
          restriction_id: string
          notes: string | null
        }
        Insert: {
          participant_id: string
          restriction_id: string
          notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['participant_restrictions']['Insert']>
        Relationships: []
      }
      events: {
        Row: {
          id: string
          host_id: string
          title: string
          description: string | null
          location: string | null
          start_date: string
          end_date: string | null
          capacity: number | null
          price: number | null
          accessibility_features: string[]
          status: EventStatus
          created_at: string
        }
        Insert: {
          id?: string
          host_id: string
          title: string
          description?: string | null
          location?: string | null
          start_date: string
          end_date?: string | null
          capacity?: number | null
          price?: number | null
          accessibility_features?: string[]
          status?: EventStatus
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['events']['Insert']>
        Relationships: []
      }
      bookings: {
        Row: {
          id: string
          event_id: string
          participant_id: string
          form_data: Record<string, unknown> | null
          status: BookingStatus
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          participant_id: string
          form_data?: Record<string, unknown> | null
          status?: BookingStatus
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['bookings']['Insert']>
        Relationships: []
      }
      reviews: {
        Row: {
          id: string
          event_id: string
          participant_id: string
          host_id: string
          rating: number
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          participant_id: string
          host_id: string
          rating: number
          comment?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['reviews']['Insert']>
        Relationships: []
      }
      review_anchors: {
        Row: {
          id: string
          review_id: string
          content_hash: string
          network: string
          tx_hash: string | null
          status: AnchorStatus
          block_number: number | null
          error_message: string | null
          requested_at: string
          confirmed_at: string | null
        }
        Insert: {
          id?: string
          review_id: string
          content_hash: string
          network?: string
          tx_hash?: string | null
          status?: AnchorStatus
          block_number?: number | null
          error_message?: string | null
          requested_at?: string
          confirmed_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['review_anchors']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      restriction_type: RestrictionType
      event_status: EventStatus
      booking_status: BookingStatus
      anchor_status: AnchorStatus
    }
    CompositeTypes: Record<string, never>
  }
}
