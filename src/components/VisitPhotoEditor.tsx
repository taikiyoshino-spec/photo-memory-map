'use client'

import { useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Photo } from '@/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Props {
  visitId: string
  visitName: string
  initialPhotos: Photo[]
  onClose: () => void
  onPhotosChange: (visitId: string, photos: Photo[]) => void
}

function compressImage(file: File, maxPx = 1280, quality = 0.75): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('compression failed'))),
        'image/jpeg',
        quality
      )
    }
    img.onerror = reject
    img.src = url
  })
}

export default function VisitPhotoEditor({
  visitId,
  visitName,
  initialPhotos,
  onClose,
  onPhotosChange,
}: Props) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleRemove(photoId: string) {
    await fetch(`/api/photos/${photoId}`, { method: 'DELETE' })
    const updated = photos.filter((p) => p.id !== photoId)
    setPhotos(updated)
    onPhotosChange(visitId, updated)
  }

  async function handleAddPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    e.target.value = ''

    setUploading(true)
    const added: Photo[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setProgress(`アップロード中... (${i + 1}/${files.length})`)

      try {
        // Compress
        let blob: Blob
        try {
          blob = await compressImage(file)
        } catch {
          blob = file
        }

        // Upload to storage
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
        const { error: storageErr } = await supabase.storage
          .from('photos')
          .upload(fileName, blob, { contentType: 'image/jpeg' })
        if (storageErr) continue

        const {
          data: { publicUrl },
        } = supabase.storage.from('photos').getPublicUrl(fileName)

        // Record in DB
        const recordRes = await fetch('/api/photos/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: publicUrl,
            taken_at: new Date().toISOString(),
            lat: null,
            lng: null,
          }),
        })
        if (!recordRes.ok) continue
        const { photo: savedPhoto } = await recordRes.json()

        // Link to visit
        await fetch(`/api/photos/${savedPhoto.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visit_id: visitId }),
        })

        added.push({ ...savedPhoto, visit_id: visitId })
      } catch {
        // skip failed file
      }
    }

    const updated = [...photos, ...added]
    setPhotos(updated)
    onPhotosChange(visitId, updated)
    setUploading(false)
    setProgress('')
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 px-4 py-3 flex items-center justify-between shadow">
        <div>
          <div className="font-medium text-sm text-gray-900 dark:text-white truncate max-w-[240px]">
            {visitName}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">写真を管理 ({photos.length}枚)</div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
        >
          ×
        </button>
      </div>

      {/* Photo grid */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-900 p-3">
        {uploading && (
          <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-sm text-blue-700 dark:text-blue-300 text-center">
            {progress}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-square rounded-lg overflow-hidden bg-gray-200 dark:bg-slate-700"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.image_url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => handleRemove(photo.id)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold leading-none shadow transition-colors"
              >
                ×
              </button>
            </div>
          ))}

          {/* Add button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 hover:border-blue-400 hover:text-blue-500 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
          >
            <span className="text-3xl leading-none">+</span>
            <span className="text-xs mt-1">追加</span>
          </button>
        </div>

        {photos.length === 0 && !uploading && (
          <p className="text-center text-gray-400 dark:text-gray-500 text-sm mt-10">
            写真がありません
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white dark:bg-slate-800 px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.1)]">
        <button
          onClick={onClose}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors"
        >
          完了
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handleAddPhotos}
      />
    </div>
  )
}
