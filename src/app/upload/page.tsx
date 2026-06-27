'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { extractExif } from '@/lib/exif'
import { groupPhotos, PhotoGroup } from '@/lib/grouping'
import { Place, Trip, PhotoWithFile } from '@/types'
import PlaceSelector from '@/components/PlaceSelector'
import TripSelector from '@/components/TripSelector'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const TIME_THRESHOLD_MS = 30 * 60 * 1000

type Step = 'select' | 'processing' | 'edit' | 'confirm' | 'done'

interface GroupState {
  id: string
  group: PhotoGroup
  selectedPlaceId: string | null
  candidates: Place[]
  loadingCandidates: boolean
}

function recalcGroup(photos: PhotoWithFile[]): Pick<PhotoGroup, 'centerLat' | 'centerLng' | 'hasGps' | 'timeStart' | 'timeEnd'> {
  const gpsPhotos = photos.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
  const hasGps = gpsPhotos.length > 0
  const times = photos.map((p) => new Date(p.taken_at).getTime())
  return {
    hasGps,
    centerLat: hasGps ? gpsPhotos.reduce((s, p) => s + p.lat!, 0) / gpsPhotos.length : null,
    centerLng: hasGps ? gpsPhotos.reduce((s, p) => s + p.lng!, 0) / gpsPhotos.length : null,
    timeStart: new Date(Math.min(...times)),
    timeEnd: new Date(Math.max(...times)),
  }
}

export default function UploadPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const addMoreInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('select')
  const [groupStates, setGroupStates] = useState<GroupState[]>([])
  const [ungrouped, setUngrouped] = useState<PhotoWithFile[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [progress, setProgress] = useState('')
  const [processingError, setProcessingError] = useState<string | null>(null)
  const [exifSummary, setExifSummary] = useState<{ total: number; withGps: number; withDate: number } | null>(null)

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    setStep('processing')
    setProgress('EXIFデータを取得中...')

    try {
      const photosWithFile: PhotoWithFile[] = []
      let withGps = 0, withDate = 0
      for (const file of files) {
        const exif = await extractExif(file)
        if (exif.lat !== null && exif.lng !== null) withGps++
        if (exif.takenAt) withDate++
        photosWithFile.push({
          taken_at: (exif.takenAt ?? new Date()).toISOString(),
          lat: exif.lat,
          lng: exif.lng,
          file,
          preview: URL.createObjectURL(file),
        })
      }
      setExifSummary({ total: files.length, withGps, withDate })

      setProgress('グルーピング中...')
      const { groups, ungrouped: ung } = groupPhotos(photosWithFile)

      const groupStatesInit: GroupState[] = groups.map((g, i) => ({
        id: `group-${i}`,
        group: g,
        selectedPlaceId: null,
        candidates: [],
        loadingCandidates: true,
      }))
      setGroupStates(groupStatesInit)
      setUngrouped(ung)
      setStep('edit')

      for (let i = 0; i < groups.length; i++) {
        const g = groups[i]
        if (!g.hasGps || g.centerLat === null || g.centerLng === null) {
          setGroupStates((prev) => {
            const next = [...prev]
            next[i] = { ...next[i], candidates: [], loadingCandidates: false }
            return next
          })
          continue
        }
        try {
          const res = await fetch(`/api/places/candidates?lat=${g.centerLat}&lng=${g.centerLng}`)
          const { places } = await res.json()
          setGroupStates((prev) => {
            const next = [...prev]
            next[i] = { ...next[i], candidates: places ?? [], selectedPlaceId: places?.[0]?.id ?? null, loadingCandidates: false }
            return next
          })
        } catch {
          setGroupStates((prev) => {
            const next = [...prev]
            next[i] = { ...next[i], loadingCandidates: false }
            return next
          })
        }
      }

      const tripRes = await fetch('/api/trips')
      const tripJson = await tripRes.json()
      setTrips(tripJson.trips ?? [])
    } catch (err) {
      console.error(err)
      setProcessingError('処理中にエラーが発生しました。')
      setStep('select')
    }
  }, [])

  const handleAddMorePhotos = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    // reset so same file can be re-selected
    e.target.value = ''

    const newPhotos: PhotoWithFile[] = []
    for (const file of files) {
      const exif = await extractExif(file)
      newPhotos.push({
        taken_at: (exif.takenAt ?? new Date()).toISOString(),
        lat: exif.lat,
        lng: exif.lng,
        file,
        preview: URL.createObjectURL(file),
      })
    }

    setGroupStates((prevGroups) => {
      const updatedGroups = prevGroups.map((gs) => ({ ...gs, group: { ...gs.group, photos: [...gs.group.photos] } }))
      const toUngrouped: PhotoWithFile[] = []

      for (const photo of newPhotos) {
        const photoTime = new Date(photo.taken_at).getTime()
        // find the first group this photo is close to (by time)
        const matchIdx = updatedGroups.findIndex((gs) =>
          gs.group.photos.some((p) => Math.abs(new Date(p.taken_at).getTime() - photoTime) <= TIME_THRESHOLD_MS)
        )
        if (matchIdx >= 0) {
          updatedGroups[matchIdx].group.photos.push(photo)
          Object.assign(updatedGroups[matchIdx].group, recalcGroup(updatedGroups[matchIdx].group.photos))
        } else {
          toUngrouped.push(photo)
        }
      }

      setUngrouped((prev) => [...prev, ...toUngrouped])
      return updatedGroups
    })

    setExifSummary((prev) => {
      if (!prev) return prev
      const withGps = newPhotos.filter((p) => p.lat !== null && p.lng !== null).length
      const withDate = newPhotos.filter((p) => p.taken_at).length
      return { total: prev.total + newPhotos.length, withGps: prev.withGps + withGps, withDate: prev.withDate + withDate }
    })
  }, [])

  const handleDeletePhotoFromGroup = useCallback((groupId: string, photoIndex: number) => {
    setGroupStates((prev) => {
      return prev
        .map((gs) => {
          if (gs.id !== groupId) return gs
          const newPhotos = gs.group.photos.filter((_, i) => i !== photoIndex)
          if (newPhotos.length === 0) return null
          return { ...gs, group: { ...gs.group, photos: newPhotos, ...recalcGroup(newPhotos) } }
        })
        .filter(Boolean) as GroupState[]
    })
  }, [])

  const handleDeleteUngrouped = useCallback((photoIndex: number) => {
    setUngrouped((prev) => prev.filter((_, i) => i !== photoIndex))
  }, [])

  const handleSelectPlace = useCallback((groupId: string, placeId: string) => {
    setGroupStates((prev) => prev.map((g) => (g.id === groupId ? { ...g, selectedPlaceId: placeId } : g)))
  }, [])

  const handleCreatePlace = useCallback(async (groupId: string, name: string, lat: number, lng: number) => {
    const res = await fetch('/api/places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, lat, lng }),
    })
    const json = await res.json()
    if (!res.ok || !json.place) {
      throw new Error(json.error ?? '施設の作成に失敗しました')
    }
    setGroupStates((prev) =>
      prev.map((g) => g.id === groupId ? { ...g, candidates: [...g.candidates, json.place], selectedPlaceId: json.place.id } : g)
    )
  }, [])

  const uploadPhotoToStorage = async (photo: PhotoWithFile): Promise<string | null> => {
    const ext = photo.file.name.split('.').pop() ?? 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error } = await supabase.storage.from('photos').upload(fileName, photo.file, { contentType: photo.file.type })
    if (error) {
      console.error('Storage upload error:', error.message)
      return null
    }
    const { data } = supabase.storage.from('photos').getPublicUrl(fileName)
    return data.publicUrl
  }

  const handleConfirm = useCallback(async (tripData: { id?: string; title?: string; startDate?: string; endDate?: string }) => {
    setStep('processing')
    setProgress('写真をアップロード中...')

    try {
      const photoIdMap = new Map<string, string>()

      const allPhotos = [...groupStates.flatMap((gs) => gs.group.photos), ...ungrouped]
      let uploadFailCount = 0
      for (let i = 0; i < allPhotos.length; i++) {
        const photo = allPhotos[i]
        setProgress(`写真をアップロード中... (${i + 1}/${allPhotos.length})`)

        const imageUrl = await uploadPhotoToStorage(photo)
        if (!imageUrl) {
          uploadFailCount++
          continue
        }

        const res = await fetch('/api/photos/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_url: imageUrl, taken_at: photo.taken_at, lat: photo.lat, lng: photo.lng }),
        })
        if (!res.ok) {
          console.warn('photo record failed:', await res.text())
          uploadFailCount++
          continue
        }
        const { photo: savedPhoto } = await res.json()
        if (savedPhoto) photoIdMap.set(photo.preview, savedPhoto.id)
      }
      if (uploadFailCount > 0) {
        console.warn(`${uploadFailCount}枚の写真が保存に失敗しました`)
      }

      setProgress('旅行記録を保存中...')

      const groupsPayload = groupStates
        .filter((gs) => gs.selectedPlaceId)
        .map((gs) => ({
          photoIds: gs.group.photos.map((p) => photoIdMap.get(p.preview)).filter(Boolean),
          placeId: gs.selectedPlaceId,
          centerLat: gs.group.centerLat ?? 0,
          centerLng: gs.group.centerLng ?? 0,
          timeStart: gs.group.timeStart.toISOString(),
          timeEnd: gs.group.timeEnd.toISOString(),
        }))

      const confirmRes = await fetch('/api/groups/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups: groupsPayload, trip: tripData }),
      })

      if (!confirmRes.ok) {
        const errData = await confirmRes.json()
        throw new Error(errData.error ?? 'confirm failed')
      }

      const { tripId } = await confirmRes.json()
      if (!tripId) throw new Error('tripId not returned')

      setStep('done')
      setTimeout(() => router.push(`/trips/${tripId}`), 1000)
    } catch (err) {
      console.error(err)
      setProcessingError(`保存中にエラーが発生しました: ${err instanceof Error ? err.message : ''}`)
      setStep('edit')
    }
  }, [groupStates, ungrouped, router])

  if (step === 'select') {
    return (
      <div className="px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-6">写真をアップロード</h1>
        {processingError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
            {processingError}
          </div>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-2xl p-12 text-center hover:border-blue-400 hover:bg-blue-50 dark:hover:border-blue-500 dark:hover:bg-blue-900/20 transition-colors"
        >
          <div className="text-4xl mb-3">📷</div>
          <div className="text-gray-600 dark:text-gray-300 font-medium">写真を選択</div>
          <div className="text-gray-400 dark:text-gray-500 text-sm mt-1">GPS情報付きの写真を選んでください</div>
        </button>
        <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFileSelect} />
      </div>
    )
  }

  if (step === 'processing') {
    return (
      <div className="px-4 py-6 flex flex-col items-center justify-center min-h-64 gap-4">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 dark:text-gray-300 text-center">{progress}</p>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="px-4 py-6 flex flex-col items-center justify-center min-h-64 gap-4">
        <div className="text-5xl">✅</div>
        <p className="text-gray-700 dark:text-gray-200 font-medium">保存しました！旅行詳細へ移動中...</p>
      </div>
    )
  }

  if (step === 'edit') {
    const unselectedCount = groupStates.filter((gs) => !gs.selectedPlaceId && !gs.loadingCandidates).length
    return (
      <div className="px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">グループを確認</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => addMoreInputRef.current?.click()}
              className="text-sm border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              + 写真を追加
            </button>
            <button onClick={() => setStep('confirm')} className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              確定へ →
            </button>
          </div>
        </div>
        <input ref={addMoreInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleAddMorePhotos} />

        {processingError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
            {processingError}
          </div>
        )}

        <p className="text-sm text-gray-500 dark:text-gray-400">
          {groupStates.length}件のグループ、{ungrouped.length}枚のGPSなし写真
        </p>

        {unselectedCount > 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg text-sm text-amber-700 dark:text-amber-400">
            ⚠️ {unselectedCount}件のグループで施設が選択されていません。施設を選択するか、新規作成してください。施設未設定のグループは保存されません。
          </div>
        )}
        {exifSummary && (
          <div className="text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 space-y-0.5">
            <div className="font-medium text-gray-600 dark:text-gray-300">📊 EXIF読み取り結果</div>
            <div className="text-gray-500 dark:text-gray-400">
              合計: {exifSummary.total}枚 ／ GPS付き: {exifSummary.withGps}枚 ／ 日時付き: {exifSummary.withDate}枚
            </div>
            {exifSummary.withGps === 0 && (
              <div className="text-orange-500 dark:text-orange-400">
                ⚠️ GPS情報が取得できませんでした。写真の位置情報が無効か、カメラ設定でOFFになっている可能性があります。
              </div>
            )}
          </div>
        )}

        {groupStates.map((gs) => (
          <div key={gs.id} className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border overflow-hidden ${
            !gs.selectedPlaceId && !gs.loadingCandidates
              ? 'border-amber-400 dark:border-amber-600'
              : 'border-gray-200 dark:border-slate-700'
          }`}>
            <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {new Date(gs.group.timeStart).toLocaleDateString('ja-JP')}{'　'}
                {new Date(gs.group.timeStart).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                {' – '}
                {new Date(gs.group.timeEnd).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                {'　'}{gs.group.photos.length}枚
              </div>
              <div className="text-xs mt-0.5">
                {gs.group.hasGps
                  ? <span className="text-green-600 dark:text-green-400">📍 GPS情報あり</span>
                  : <span className="text-orange-500 dark:text-orange-400">📍 GPS情報なし（時間でグループ化）</span>
                }
              </div>
            </div>
            <div className="flex gap-1.5 p-3 overflow-x-auto">
              {gs.group.photos.map((photo, i) => (
                <div key={i} className="relative flex-shrink-0 w-16 h-16 rounded-md overflow-hidden bg-gray-100 dark:bg-slate-700">
                  <img src={photo.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleDeletePhotoFromGroup(gs.id, i)}
                    className="absolute top-0 right-0 w-5 h-5 bg-red-500 hover:bg-red-600 text-white flex items-center justify-center text-xs leading-none rounded-bl"
                    aria-label="削除"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="px-4 pb-4">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 font-medium">施設を選択</div>
              {gs.loadingCandidates ? (
                <div className="text-xs text-gray-400 dark:text-gray-500">候補を検索中...</div>
              ) : (
                <PlaceSelector
                  candidates={gs.candidates}
                  selectedPlaceId={gs.selectedPlaceId}
                  onSelect={(placeId) => handleSelectPlace(gs.id, placeId)}
                  onCreateNew={(name, lat, lng) => handleCreatePlace(gs.id, name, lat, lng)}
                  centerLat={Number.isFinite(gs.group.centerLat) ? gs.group.centerLat! : 35.6895}
                  centerLng={Number.isFinite(gs.group.centerLng) ? gs.group.centerLng! : 139.6917}
                />
              )}
            </div>
          </div>
        ))}

        {ungrouped.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">📍 GPS情報なし（{ungrouped.length}枚）</div>
            <div className="flex gap-1.5 overflow-x-auto">
              {ungrouped.map((photo, i) => (
                <div key={i} className="relative flex-shrink-0 w-14 h-14 rounded-md overflow-hidden bg-gray-100 dark:bg-slate-700">
                  <img src={photo.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleDeleteUngrouped(i)}
                    className="absolute top-0 right-0 w-5 h-5 bg-red-500 hover:bg-red-600 text-white flex items-center justify-center text-xs leading-none rounded-bl"
                    aria-label="削除"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={() => setStep('confirm')} className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors">
          確定へ進む →
        </button>
      </div>
    )
  }

  if (step === 'confirm') {
    const defaultStart = groupStates[0]?.group.timeStart.toISOString().slice(0, 10) ?? ''
    const defaultEnd = groupStates[groupStates.length - 1]?.group.timeEnd.toISOString().slice(0, 10) ?? ''
    return (
      <div className="px-4 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep('edit')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">← 戻る</button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">旅行に追加</h1>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <TripSelector
            trips={trips}
            defaultStartDate={defaultStart}
            defaultEndDate={defaultEnd}
            onSelect={(tripId) => handleConfirm({ id: tripId })}
            onCreateNew={(title, startDate, endDate) => handleConfirm({ title, startDate, endDate })}
          />
        </div>
      </div>
    )
  }

  return null
}
