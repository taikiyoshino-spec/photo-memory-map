'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trip, Photo } from '@/types'

const VisitPhotoEditor = dynamic(() => import('./VisitPhotoEditor'), { ssr: false })

interface PlaceData {
  id: string
  name: string
  lat: number
  lng: number
}

interface VisitData {
  id: string
  place_id: string
  visited_at_start: string
  visited_at_end: string
  places: PlaceData | null
  photos: Photo[]
}

interface Props {
  trip: Trip
  visits: VisitData[]
}

function groupByDay(visits: VisitData[]): [string, VisitData[]][] {
  const map = new Map<string, VisitData[]>()
  for (const v of visits) {
    const day = v.visited_at_start.slice(0, 10)
    if (!map.has(day)) map.set(day, [])
    map.get(day)!.push(v)
  }
  return Array.from(map.entries())
}

export default function TripDetailClient({ trip: initialTrip, visits: initialVisits }: Props) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(initialTrip.title)
  const [startDate, setStartDate] = useState(initialTrip.start_date)
  const [endDate, setEndDate] = useState(initialTrip.end_date)
  const [visits, setVisits] = useState(initialVisits)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editingVisit, setEditingVisit] = useState<VisitData | null>(null)

  function handlePhotosChange(visitId: string, photos: Photo[]) {
    setVisits((prev) => prev.map((v) => (v.id === visitId ? { ...v, photos } : v)))
  }

  const totalPhotos = visits.reduce((acc, v) => acc + v.photos.length, 0)

  function cancelEdit() {
    setTitle(initialTrip.title)
    setStartDate(initialTrip.start_date)
    setEndDate(initialTrip.end_date)
    setIsEditing(false)
    setError(null)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/trips/${initialTrip.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, start_date: startDate, end_date: endDate }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? '保存に失敗しました')
      }
      setIsEditing(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteVisit(visitId: string) {
    if (!confirm('このピンを旅行から削除しますか？\n（写真はアーカイブされ、施設自体は残ります）')) return
    setDeletingId(visitId)
    try {
      const res = await fetch(`/api/visits/${visitId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setVisits(prev => prev.filter(v => v.id !== visitId))
      router.refresh()
    } catch {
      alert('削除に失敗しました')
    } finally {
      setDeletingId(null)
    }
  }

  const days = groupByDay(visits)

  return (
    <div className="px-4 py-6 space-y-6">
      {/* ヘッダー */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
        {isEditing ? (
          <div className="space-y-3">
            <input
              className="w-full text-xl font-bold bg-gray-50 dark:bg-slate-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="旅行タイトル"
            />
            <div className="flex gap-2 items-center">
              <input
                type="date"
                className="flex-1 bg-gray-50 dark:bg-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
              <span className="text-gray-400 text-sm">〜</span>
              <input
                type="date"
                className="flex-1 bg-gray-50 dark:bg-slate-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving || !title.trim()}
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
              <button
                onClick={() => setIsEditing(true)}
                className="flex-shrink-0 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                編集
              </button>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {startDate} 〜 {endDate}
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-300">
                <span>📷 {totalPhotos}枚</span>
                <span>📍 {visits.length}施設</span>
              </div>
              <Link
                href={`/upload?tripId=${initialTrip.id}`}
                className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
              >
                + 写真を追加
              </Link>
            </div>
          </>
        )}
      </div>

      {/* 編集モード説明 */}
      {isEditing && visits.length > 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 -mt-2">
          各ピンの右端のボタンで削除できます
        </p>
      )}

      {/* 日別タイムライン */}
      <div className="space-y-6">
        {days.map(([day, dayVisits], dayIdx) => (
          <div key={day}>
            <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
              【Day {dayIdx + 1}】
              {new Date(day + 'T00:00:00').toLocaleDateString('ja-JP', {
                month: 'long',
                day: 'numeric',
                weekday: 'short',
              })}
            </div>
            <div className="space-y-3">
              {dayVisits.map((visit) => (
                <div
                  key={visit.id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden"
                >
                  <div className="flex items-stretch border-b border-gray-100 dark:border-slate-700">
                    <Link
                      href={`/places/${visit.place_id}`}
                      className="flex-1 block px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {visit.places?.name ?? '施設名なし'}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {new Date(visit.visited_at_start).toLocaleTimeString('ja-JP', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {' – '}
                        {new Date(visit.visited_at_end).toLocaleTimeString('ja-JP', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </Link>
                    <button
                      onClick={() => setEditingVisit(visit)}
                      className="px-3 text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-blue-500 transition-colors"
                      title="写真を変更"
                    >
                      📷
                    </button>
                    {isEditing && (
                      <button
                        onClick={() => handleDeleteVisit(visit.id)}
                        disabled={deletingId === visit.id}
                        className="px-4 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition-colors"
                        title="このピンを削除"
                      >
                        {deletingId === visit.id ? '…' : '🗑'}
                      </button>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex gap-1 overflow-x-auto">
                      {visit.photos.slice(0, 8).map((photo) => (
                        <div
                          key={photo.id}
                          className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden"
                        >
                          <img src={photo.image_url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {visit.photos.length > 8 && (
                        <div className="flex-shrink-0 w-16 h-16 rounded-md bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
                          +{visit.photos.length - 8}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {visits.length === 0 && (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
            ピンがありません
          </div>
        )}
      </div>

      {editingVisit && (
        <VisitPhotoEditor
          visitId={editingVisit.id}
          visitName={editingVisit.places?.name ?? '施設名なし'}
          initialPhotos={editingVisit.photos}
          onClose={() => setEditingVisit(null)}
          onPhotosChange={handlePhotosChange}
        />
      )}
    </div>
  )
}
