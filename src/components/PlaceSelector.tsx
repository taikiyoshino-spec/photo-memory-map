'use client'

import { useState } from 'react'
import { Place } from '@/types'

interface Props {
  candidates: Place[]
  selectedPlaceId: string | null
  onSelect: (placeId: string) => void
  onCreateNew: (name: string, lat: number, lng: number) => Promise<void>
  centerLat: number
  centerLng: number
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
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const hasValidGps = centerLat !== 35.6895 || centerLng !== 139.6917

  const handleCreate = async () => {
    if (!newName.trim()) { setError('施設名を入力してください'); return }
    setError('')
    setCreating(true)
    try {
      await onCreateNew(newName.trim(), centerLat, centerLng)
      setShowCreate(false)
      setNewName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '作成に失敗しました')
    } finally {
      setCreating(false)
    }
  }

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
          + 新規作成
        </button>
      ) : (
        <div className="border border-gray-200 dark:border-slate-600 rounded-lg p-3 space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => { setNewName(e.target.value); setError('') }}
            placeholder="施設名（例：東京ディズニーランド）"
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-gray-400"
          />

          <div className={`text-xs px-1 ${hasValidGps ? 'text-green-600 dark:text-green-400' : 'text-orange-500 dark:text-orange-400'}`}>
            {hasValidGps
              ? `📍 写真のGPS位置に登録 (${centerLat.toFixed(4)}, ${centerLng.toFixed(4)})`
              : '⚠️ GPS情報がないため、位置は未設定になります'}
          </div>

          {error && (
            <div className="text-xs text-red-500 dark:text-red-400">{error}</div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex-1 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? '作成中...' : '作成'}
            </button>
            <button
              onClick={() => { setShowCreate(false); setNewName(''); setError('') }}
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
