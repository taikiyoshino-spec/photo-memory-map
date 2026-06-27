'use client'

import { Photo } from '@/types'

interface Props {
  photos: Photo[]
  onPhotoClick?: (photo: Photo) => void
}

export default function PhotoGrid({ photos, onPhotoClick }: Props) {
  if (photos.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {photos.map((photo) => (
        <button
          key={photo.id}
          onClick={() => onPhotoClick?.(photo)}
          className="w-20 h-20 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 hover:opacity-90 transition-opacity"
        >
          <img src={photo.image_url} alt="" className="w-full h-full object-cover" />
        </button>
      ))}
    </div>
  )
}
