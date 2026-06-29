'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Place, Visit, Photo, Trip } from '@/types'
import { searchPlacesByName, NominatimSearchResult } from '@/lib/nominatim'

const LocationPicker = dynamic(() => import('./LocationPicker'), { ssr: false })

interface VisitWithTrip extends Visit {
  trip: Trip
  photos: Photo[]
}

interface Props {
  place: Place
  visits: VisitWithTrip[]
}

export default function PlaceDetailClient({ place: initialPlace, visits }: Props) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(initialPlace.name)
  const [coords, setCoords] = useState({ lat: initialPlace.lat, lng: initialPlace.lng })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 場所検索
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<NominatimSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showMap, setShowMap] = useState(false)

  const mainPhoto = visits[0]?.photos[0]

  function cancelEdit() {
    setName(initialPlace.name)
    setCoords({ lat: initialPlace.lat, lng: initialPlace.lng })
    setIsEditing(false)
    setShowSearch(false)
    setSearchQuery('')
    setSearchResults([])
    setError(null)
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearching(true)
    setSearchResults([])
    try {
      const results = await searchPlacesByName(searchQuery)
      setSearchResults(results)
    } finally {
      setSearching(false)
    }
  }

  function handleSelectResult(result: NominatimSearchResult) {
    setCoords({ lat: parseFloat(result.lat), lng: parseFloat(result.lon) })
    setName(result.name || result.display_name.split(',')[0].trim())
    setSearchResults([])
    setSearchQuery('')
    setShowSearch(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/places/${initialPlace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, lat: coords.lat, lng: coords.lng }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? '保存に失敗しました')
      }
      setIsEditing(false)
      setShowSearch(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const coordsChanged = coords.lat !== initialPlace.lat || coords.lng !== initialPlace.lng

  async function handleDelete() {
    if (!confirm(`「${name}」を削除しますか？\nこの操作は元に戻せません。`)) return
    const res = await fetch(`/api/places/${initialPlace.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json()
      alert(json.error ?? '削除に失敗しました')
      return
    }
    router.push('/places')
  }

  return (
    <>
    {showMap && (
      <LocationPicker
        initialLat={coords.lat}
        initialLng={coords.lng}
        onConfirm={(lat, lng, suggestedName) => {
          setCoords({ lat, lng })
          if (suggestedName && name === initialPlace.name) setName(suggestedName)
          setShowMap(false)
        }}
        onClose={() => setShowMap(false)}
      />
    )}
    <div className="px-4 py-6 space-y-6">
      {/* ヘッダー */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex items-start gap-4">
          {mainPhoto && (
            <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
              <img src={mainPhoto.image_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-3">
                {/* 施設名 */}
                <input
                  className="w-full text-xl font-bold bg-gray-50 dark:bg-slate-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="施設名"
                />

                {/* 位置情報 */}
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <div className={coordsChanged ? 'text-green-600 dark:text-green-400' : ''}>
                    📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                    {coordsChanged && ' （変更あり）'}
                  </div>
                </div>

                {/* 場所を再検索 / 地図から選ぶ */}
                {!showSearch ? (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowSearch(true)}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      🔍 名前で検索
                    </button>
                    <button
                      onClick={() => setShowMap(true)}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      🗺 地図から選ぶ
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        placeholder="施設名で検索..."
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-gray-400"
                      />
                      <button
                        onClick={handleSearch}
                        disabled={searching || !searchQuery.trim()}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-sm rounded-lg disabled:opacity-40"
                      >
                        {searching ? '…' : '🔍'}
                      </button>
                    </div>
                    {searchResults.length > 0 && (
                      <div className="border border-gray-200 dark:border-slate-600 rounded-lg overflow-hidden">
                        {searchResults.map(result => (
                          <button
                            key={result.place_id}
                            onClick={() => handleSelectResult(result)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-slate-700 border-b last:border-0 border-gray-100 dark:border-slate-700"
                          >
                            <div className="font-medium text-gray-800 dark:text-gray-200">
                              {result.name || result.display_name.split(',')[0].trim()}
                            </div>
                            <div className="text-xs text-gray-400 truncate">{result.display_name}</div>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.length === 0 && !searching && searchQuery && (
                      <p className="text-xs text-gray-400">候補が見つかりません</p>
                    )}
                  </div>
                )}

                {error && <p className="text-sm text-red-500">{error}</p>}

                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving || !name.trim()}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
                  >
                    {saving ? '保存中...' : '保存'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{name}</h1>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex-shrink-0 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    編集
                  </button>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">訪問 {visits.length} 回</div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  📍 {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 訪問記録なしの場合は削除ボタン */}
      {visits.length === 0 && !isEditing && (
        <button
          onClick={handleDelete}
          className="w-full py-3 rounded-xl border border-red-300 dark:border-red-700 text-red-500 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          🗑 この施設を削除
        </button>
      )}

      {/* タイムライン */}
      <div className="space-y-4">
        <h2 className="font-semibold text-gray-700 dark:text-gray-300">訪問履歴</h2>
        {visits.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500 text-sm">訪問記録がありません</p>
        ) : (
          visits.map((visit) => (
            <Link
              key={visit.id}
              href={`/trips/${visit.trip_id}`}
              className="block bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 hover:border-blue-300 dark:hover:border-blue-500 transition-colors"
            >
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {new Date(visit.visited_at_start).getFullYear()}
                </span>
                <span className="text-sm text-blue-600 dark:text-blue-400">{visit.trip.title}</span>
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                {new Date(visit.visited_at_start).toLocaleDateString('ja-JP')}
              </div>
              <div className="flex gap-1 overflow-x-auto">
                {visit.photos.slice(0, 6).map((photo) => (
                  <div key={photo.id} className="flex-shrink-0 w-14 h-14 rounded-md overflow-hidden">
                    <img src={photo.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
                {visit.photos.length > 6 && (
                  <div className="flex-shrink-0 w-14 h-14 rounded-md bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
                    +{visit.photos.length - 6}
                  </div>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
    </>
  )
}
