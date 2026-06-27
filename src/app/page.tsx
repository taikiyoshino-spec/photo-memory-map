'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Place } from '@/types'
import StatsBar from '@/components/StatsBar'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

interface Stats {
  placeCount: number
  tripCount: number
  prefectureCount: number
  places: Place[]
}

export default function HomePage() {
  const [stats, setStats] = useState<Stats>({ placeCount: 0, tripCount: 0, prefectureCount: 0, places: [] })
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((data) => { setStats(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handlePlaceClick = useCallback((place: Place) => {
    setSelectedPlace(place)
  }, [])

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      {/* 統計バー */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-3 flex items-center gap-6">
        <StatsBar
          placeCount={stats.placeCount}
          tripCount={stats.tripCount}
          prefectureCount={stats.prefectureCount}
        />
        {stats.placeCount === 0 && !loading && (
          <Link
            href="/upload"
            className="ml-auto text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            写真をアップロード
          </Link>
        )}
      </div>

      {/* 地図 */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500">
            読み込み中...
          </div>
        ) : (
          <MapView places={stats.places} onPlaceClick={handlePlaceClick} />
        )}

        {/* 施設選択ポップアップ */}
        {selectedPlace && (
          <div className="absolute bottom-4 left-4 right-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-600 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">{selectedPlace.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {selectedPlace.lat.toFixed(4)}, {selectedPlace.lng.toFixed(4)}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPlace(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none ml-4"
                >
                  ×
                </button>
              </div>
              <Link
                href={`/places/${selectedPlace.id}`}
                className="mt-3 block text-center text-sm bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                施設詳細を見る →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
