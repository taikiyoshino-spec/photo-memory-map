'use client'

import { useEffect, useRef, useState } from 'react'
import { reverseGeocode } from '@/lib/nominatim'

interface Props {
  initialLat?: number
  initialLng?: number
  onConfirm: (lat: number, lng: number, suggestedName?: string) => void
  onClose: () => void
}

export default function LocationPicker({ initialLat, initialLng, onConfirm, onClose }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<import('leaflet').Map | null>(null)
  const markerRef = useRef<import('leaflet').Marker | null>(null)
  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(
    initialLat != null && initialLng != null ? { lat: initialLat, lng: initialLng } : null
  )
  const [suggestedName, setSuggestedName] = useState<string | null>(null)

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

      const hasInit = initialLat != null && initialLng != null
      const center: [number, number] = hasInit ? [initialLat!, initialLng!] : [36.5, 136.5]
      const zoom = hasInit ? 13 : 5

      const map = L.map(mapRef.current!, { center, zoom })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)
      mapInstanceRef.current = map

      if (hasInit) {
        markerRef.current = L.marker([initialLat!, initialLng!]).addTo(map)
      }

      map.on('click', (e) => {
        const { lat, lng } = e.latlng
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng])
        } else {
          markerRef.current = L.marker([lat, lng]).addTo(map)
        }
        setSelected({ lat, lng })
        setSuggestedName(null)
        reverseGeocode(lat, lng).then(name => setSuggestedName(name))
      })
    })

    return () => {
      mapInstanceRef.current?.remove()
      mapInstanceRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60">
      {/* ヘッダー */}
      <div className="bg-white dark:bg-slate-800 px-4 py-3 flex items-center justify-between flex-shrink-0 shadow">
        <div>
          <div className="font-medium text-sm text-gray-900 dark:text-white">地図から場所を選択</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">タップして場所を指定</div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none px-1">
          ×
        </button>
      </div>

      {/* 地図 */}
      <div ref={mapRef} className="flex-1" />

      {/* フッター */}
      <div className="bg-white dark:bg-slate-800 px-4 py-3 flex-shrink-0 shadow-[0_-2px_8px_rgba(0,0,0,0.1)]">
        {selected ? (
          <div className="space-y-2">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              📍 {selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}
            </div>
            {suggestedName && (
              <div className="text-sm text-blue-600 dark:text-blue-400 truncate">
                → {suggestedName}
              </div>
            )}
            <button
              onClick={() => onConfirm(selected.lat, selected.lng, suggestedName ?? undefined)}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors"
            >
              この場所に決定
            </button>
          </div>
        ) : (
          <div className="text-sm text-gray-400 dark:text-gray-500 text-center py-2">
            地図をタップして場所を選んでください
          </div>
        )}
      </div>
    </div>
  )
}
