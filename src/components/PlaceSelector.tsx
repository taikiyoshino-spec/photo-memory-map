'use client'

import { useState } from 'react'
import { Place } from '@/types'
import { searchPlacesByName, NominatimSearchResult } from '@/lib/nominatim'

interface Props {
  candidates: Place[]
  selectedPlaceId: string | null
  onSelect: (placeId: string) => void
  onCreateNew: (name: string, lat: number, lng: number) => Promise<void>
  centerLat: number
  centerLng: number
}

interface SelectedCoords {
  lat: number
  lng: number
  fromSearch: boolean
}

export default function PlaceSelector({
  candidates,
  selectedPlaceId,
  onSelect,
  onCreateNew,
  centerLat,
  centerLng,
}: Props) {
  const [showCreate, setShowCreate] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<NominatimSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedCoords, setSelectedCoords] = useState<SelectedCoords | null>(null)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const hasValidGps = Number.isFinite(centerLat) && Number.isFinite(centerLng) &&
    (centerLat !== 35.6895 || centerLng !== 139.6917)

  const handleSearch = async () => {
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

  const handleSelectResult = (result: NominatimSearchResult) => {
    const name = result.name || result.display_name.split(',')[0].trim()
    setSelectedCoords({ lat: parseFloat(result.lat), lng: parseFloat(result.lon), fromSearch: true })
    setNewName(name)
    setSearchResults([])
    setSearchQuery('')
  }

  const handleCreate = async () => {
    if (!newName.trim()) { setError('施設名を入力してください'); return }

    const coords = selectedCoords ?? (hasValidGps ? { lat: centerLat, lng: centerLng, fromSearch: false } : null)
    if (!coords) {
      setError('施設名を検索して位置情報を取得してください')
      return
    }

    setError('')
    setCreating(true)
    try {
      await onCreateNew(newName.trim(), coords.lat, coords.lng)
      resetCreate()
    } catch (e) {
      setError(e instanceof Error ? e.message : '作成に失敗しました')
    } finally {
      setCreating(false)
    }
  }

  const resetCreate = () => {
    setShowCreate(false)
    setSearchQuery('')
    setSearchResults([])
    setSelectedCoords(null)
    setNewName('')
    setError('')
  }

  const canCreate = !!selectedCoords || hasValidGps

  return (
    <div className="space-y-1">
      {candidates.map((place) => (
        <button
          key={place.id}
          onClick={() => onSelect(place.id)}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
            selectedPlaceId === place.id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-200'
          }`}
        >
          <span>{selectedPlaceId === place.id ? '★' : '　'}</span>
          {place.name}
        </button>
      ))}

      {!showCreate ? (
        <button
          onClick={() => setShowCreate(true)}
          className="w-full text-left px-3 py-2 rounded-lg text-sm bg-gray-50 hover:bg-gray-100 text-gray-500 border border-dashed border-gray-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-gray-400 dark:border-slate-600"
        >
          + 施設を検索 / 新規作成
        </button>
      ) : (
        <div className="border border-gray-200 dark:border-slate-600 rounded-lg p-3 space-y-2">

          {/* 施設名検索 */}
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">施設名で検索</div>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="例：東京ディズニーランド"
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-gray-400"
            />
            <button
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg disabled:opacity-40 transition-colors"
            >
              {searching ? '…' : '🔍'}
            </button>
          </div>

          {/* 検索結果 */}
          {searchResults.length > 0 && (
            <div className="border border-gray-200 dark:border-slate-600 rounded-lg overflow-hidden">
              {searchResults.map((result) => (
                <button
                  key={result.place_id}
                  onClick={() => handleSelectResult(result)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-slate-700 border-b last:border-0 border-gray-100 dark:border-slate-700 transition-colors"
                >
                  <div className="font-medium text-gray-800 dark:text-gray-200">
                    {result.name || result.display_name.split(',')[0].trim()}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                    {result.display_name}
                  </div>
                </button>
              ))}
            </div>
          )}

          {searchResults.length === 0 && !searching && searchQuery && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              候補が見つかりません。名前を変えて再検索するか、直接入力してください。
            </p>
          )}

          {/* 位置情報の状態表示 */}
          {selectedCoords?.fromSearch && (
            <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
              📍 検索結果の位置で登録 ({selectedCoords.lat.toFixed(4)}, {selectedCoords.lng.toFixed(4)})
            </div>
          )}
          {!selectedCoords && hasValidGps && (
            <div className="text-xs text-green-600 dark:text-green-400">
              📍 写真のGPS位置で登録 ({centerLat.toFixed(4)}, {centerLng.toFixed(4)})
            </div>
          )}
          {!selectedCoords && !hasValidGps && (
            <div className="text-xs text-orange-500 dark:text-orange-400">
              ⚠️ 写真にGPS情報がありません。上の検索で位置情報を取得してください。
            </div>
          )}

          {/* 施設名入力（検索後または直接入力） */}
          <input
            type="text"
            value={newName}
            onChange={(e) => { setNewName(e.target.value); setError('') }}
            placeholder={selectedCoords ? '施設名（編集可）' : hasValidGps ? '施設名を入力' : '先に施設名で検索してください'}
            disabled={!canCreate}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-gray-400 disabled:opacity-50"
          />

          {error && <div className="text-xs text-red-500 dark:text-red-400">{error}</div>}

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={creating || !canCreate || !newName.trim()}
              className="flex-1 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {creating ? '作成中...' : '作成'}
            </button>
            <button
              onClick={resetCreate}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 dark:bg-slate-600 dark:text-gray-200 dark:hover:bg-slate-500"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
