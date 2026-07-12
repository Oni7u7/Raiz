import { useRef } from 'react'
import { Autocomplete, GoogleMap, MarkerF, useJsApiLoader } from '@react-google-maps/api'

// Solo se pide la library 'places' (autocompletado). Este array debe ser un
// literal estable (no un array nuevo en cada render) porque
// @react-google-maps/api recarga el script si la referencia cambia.
const LIBRARIES: 'places'[] = ['places']

const MAP_CONTAINER_STYLE = { width: '100%', height: '200px', marginTop: '0.6rem', borderRadius: 'var(--r-md)' }

interface AddressAutocompleteFieldProps {
  value: string
  latitude: number | null
  longitude: number | null
  onChange: (next: { address: string; latitude: number | null; longitude: number | null }) => void
}

export function AddressAutocompleteField({ value, latitude, longitude, onChange }: AddressAutocompleteFieldProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: apiKey || '', libraries: LIBRARIES })
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  function handlePlaceChanged() {
    const place = autocompleteRef.current?.getPlace()
    if (!place?.geometry?.location) {
      // El usuario tecleó y dio enter sin elegir una sugerencia real:
      // no hay coordenadas confiables, solo guarda el texto.
      onChange({ address: place?.name ?? value, latitude: null, longitude: null })
      return
    }
    onChange({
      address: place.formatted_address ?? place.name ?? value,
      latitude: place.geometry.location.lat(),
      longitude: place.geometry.location.lng(),
    })
  }

  // Sin API key configurada o mientras el script carga: input de texto
  // plano normal, igual que el campo original. Una feature externa
  // faltante nunca debe romper el formulario.
  if (!apiKey || !isLoaded) {
    return (
      <input
        id="location"
        value={value}
        onChange={(e) => onChange({ address: e.target.value, latitude: null, longitude: null })}
      />
    )
  }

  return (
    <div>
      <Autocomplete
        onLoad={(autocomplete) => {
          autocompleteRef.current = autocomplete
        }}
        onPlaceChanged={handlePlaceChanged}
        restrictions={{ country: 'mx' }}
        fields={['formatted_address', 'name', 'geometry.location']}
      >
        <input
          id="location"
          value={value}
          onChange={(e) => onChange({ address: e.target.value, latitude: null, longitude: null })}
        />
      </Autocomplete>

      {latitude != null && longitude != null && (
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE}
          center={{ lat: latitude, lng: longitude }}
          zoom={15}
          options={{ disableDefaultUI: true, gestureHandling: 'none', clickableIcons: false }}
        >
          <MarkerF position={{ lat: latitude, lng: longitude }} />
        </GoogleMap>
      )}
    </div>
  )
}
