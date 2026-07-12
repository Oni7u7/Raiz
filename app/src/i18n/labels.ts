// Traducciones de vocabulario FIJO que viene de la base de datos — enums y
// listas cerradas de opciones. Solo afectan lo que se muestra en pantalla;
// lo que se guarda/manda a Supabase sigue siendo exactamente el valor en
// español de siempre (RLS, triggers y datos ya guardados comparan contra
// esos strings literales, así que nunca se tocan).
//
// Contenido real generado por usuarios (títulos/descripciones de eventos,
// bios, comentarios, el catálogo de `restrictions`, texto libre de "Otro")
// NO vive aquí — no hay forma de traducirlo automáticamente.
import type { BookingStatus, EventStatus, RestrictionType } from '../types/database'

export const BOOKING_STATUS_LABELS: Record<BookingStatus, { es: string; en: string }> = {
  pendiente: { es: 'Pendiente', en: 'Pending' },
  confirmado: { es: 'Confirmado', en: 'Confirmed' },
  cancelado: { es: 'Cancelado', en: 'Cancelled' },
  asistio: { es: 'Asistió', en: 'Attended' },
  no_asistio: { es: 'No asistió', en: 'No-show' },
  en_espera: { es: 'En espera', en: 'Waitlisted' },
}

export const EVENT_STATUS_LABELS: Record<EventStatus, { es: string; en: string }> = {
  borrador: { es: 'Borrador', en: 'Draft' },
  publicado: { es: 'Publicado', en: 'Published' },
  cancelado: { es: 'Cancelado', en: 'Cancelled' },
  finalizado: { es: 'Finalizado', en: 'Finished' },
}

export const RESTRICTION_TYPE_LABELS: Record<RestrictionType, { es: string; en: string }> = {
  dietetica: { es: 'dietética', en: 'dietary' },
  medica: { es: 'médica', en: 'medical' },
  accesibilidad: { es: 'accesibilidad', en: 'accessibility' },
  otra: { es: 'otra', en: 'other' },
}

// Una entrada por cada string de ACCESSIBILITY_OPTIONS en
// pages/dashboard/EventForm.tsx — las keys son el valor real guardado en
// `events.accessibility_features` (en español), así que si esa lista
// cambia, esta debe actualizarse junto con ella.
export const ACCESSIBILITY_OPTION_LABELS: Record<string, { es: string; en: string }> = {
  'Camino plano / sin escalones': { es: 'Camino plano / sin escalones', en: 'Flat path / no stairs' },
  'Terreno irregular': { es: 'Terreno irregular', en: 'Uneven terrain' },
  'Rampas disponibles': { es: 'Rampas disponibles', en: 'Ramps available' },
  'Baños accesibles': { es: 'Baños accesibles', en: 'Accessible restrooms' },
  'Apoyo para visión (baja visión/ciegos)': {
    es: 'Apoyo para visión (baja visión/ciegos)',
    en: 'Vision support (low vision/blind)',
  },
  'Apoyo para audición (sordera/hipoacusia)': {
    es: 'Apoyo para audición (sordera/hipoacusia)',
    en: 'Hearing support (deaf/hard of hearing)',
  },
  'Asientos disponibles': { es: 'Asientos disponibles', en: 'Seating available' },
  'Estacionamiento accesible': { es: 'Estacionamiento accesible', en: 'Accessible parking' },
}

// Para un string que no está en el mapa (texto libre del checkbox "Otro"),
// se muestra tal cual en ambos idiomas — es contenido real, no vocabulario
// fijo, no hay nada que traducir automáticamente.
export function accessibilityLabel(value: string, language: 'es' | 'en'): string {
  return ACCESSIBILITY_OPTION_LABELS[value]?.[language] ?? value
}
