'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Group, Place } from '@/types'
import PlaceSelector from './PlaceSelector'

interface Props {
  group: Group & { photos: NonNullable<Group['photos']>; place_candidates: NonNullable<Group['place_candidates']> }
  onSelectPlace: (groupId: string, placeId: string) => void
  onCreatePlace: (groupId: string, name: string, lat: number, lng: number) => Promise<void>
}

export default function GroupCard({ group, onSelectPlace, onCreatePlace }: Props) {
  const [open, setOpen] = useState(true)
  const start = new Date(group.time_start)
  const end = new Date(group.time_end)
  const selectedPlace = group.place_candidates.find((c) => c.place_id === group.selected_place_id)?.place

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* ヘッダー */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
      >
        <div>
          <div className="font-medium text-gray-900">
            {selectedPlace?.name ?? '未確定'}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {start.toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            {' – '}
            {end.toLocaleString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
            　{group.photos.length}枚
          </div>
        </div>
        <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {/* 写真サムネイル */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {group.photos.slice(0, 8).map((photo) => (
              <div key={photo.id} className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden bg-gray-100">
                <img
                  src={photo.image_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            {group.photos.length > 8 && (
              <div className="flex-shrink-0 w-16 h-16 rounded-md bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                +{group.photos.length - 8}
              </div>
            )}
          </div>

          {/* 施設選択 */}
          <div>
            <div className="text-xs text-gray-500 mb-1.5 font-medium">施設を選択</div>
            <PlaceSelector
              candidates={group.place_candidates.map((c) => c.place)}
              selectedPlaceId={group.selected_place_id}
              onSelect={(placeId) => onSelectPlace(group.id, placeId)}
              onCreateNew={(name, lat, lng) => onCreatePlace(group.id, name, lat, lng)}
              centerLat={group.center_lat}
              centerLng={group.center_lng}
            />
          </div>
        </div>
      )}
    </div>
  )
}
