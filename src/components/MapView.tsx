'use client'

import { useEffect, useRef, useState } from 'react'
import { Place } from '@/types'

interface Props {
  places: Place[]
  onPlaceClick: (place: Place) => void
}

export default function MapView({ places, onPlaceClick }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<import('leaflet').Map | null>(null)
  const markersRef = useRef<import('leaflet').Marker[]>([])
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    import('leaflet').then((L) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current!, {
        center: [36.5, 136.5],
        zoom: 5,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      mapInstanceRef.current = map
      setMapReady(true)
    })

    return () => {
      mapInstanceRef.current?.remove()
      mapInstanceRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapInstanceRef.current) return

    import('leaflet').then((L) => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []

      places.forEach((place) => {
        const marker = L.marker([place.lat, place.lng])
          .addTo(mapInstanceRef.current!)
          .bindTooltip(place.name, { permanent: false, direction: 'top' })
          .on('click', () => onPlaceClick(place))
        markersRef.current.push(marker)
      })

      // 複数ピンがある場合は全体が見えるようにズーム調整
      if (places.length > 0) {
        const bounds = L.latLngBounds(places.map(p => [p.lat, p.lng]))
        mapInstanceRef.current!.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 })
      }
    })
  // mapReady を依存に追加することで、地図初期化後に確実にマーカーを描画する
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, onPlaceClick, mapReady])

  return <div ref={mapRef} className="w-full h-full" />
}
