// Prioriza coordenadas (guardadas por el autocompletado de Google Places)
// sobre el texto de la dirección — así el link nunca desaparece para
// eventos viejos o direcciones escritas a mano, solo pierde precisión.
export function googleMapsSearchUrl(
  location: string | null,
  latitude: number | null,
  longitude: number | null,
): string | null {
  if (latitude != null && longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
  }
  if (location) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
  }
  return null
}
