import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
import { Photo } from '@/types'

interface PlaceData { id: string; name: string; lat: number; lng: number }
interface VisitData {
  id: string
  place_id: string
  visited_at_start: string
  visited_at_end: string
  places: PlaceData | null
  photos: Photo[]
}

async function getTripData(id: string) {
  const { data: trip } = await supabase.from('trips').select('*').eq('id', id).single()
  if (!trip) return null

  const { data: visits } = await supabase
    .from('visits')
    .select('id, place_id, visited_at_start, visited_at_end, places ( id, name, lat, lng )')
    .eq('trip_id', id)
    .order('visited_at_start')

  const visitsWithPhotos: VisitData[] = []
  for (const v of visits ?? []) {
    const { data: photos } = await supabase
      .from('photos')
      .select('*')
      .eq('visit_id', v.id)
      .order('taken_at')

    visitsWithPhotos.push({
      id: v.id,
      place_id: v.place_id,
      visited_at_start: v.visited_at_start,
      visited_at_end: v.visited_at_end,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      places: (v as any).places ?? null,
      photos: photos ?? [],
    })
  }

  return { trip, visits: visitsWithPhotos }
}

function groupByDay(visits: VisitData[]): Map<string, VisitData[]> {
  const map = new Map<string, VisitData[]>()
  for (const v of visits) {
    const day = v.visited_at_start.slice(0, 10)
    if (!map.has(day)) map.set(day, [])
    map.get(day)!.push(v)
  }
  return map
}

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getTripData(id)
  if (!data) notFound()

  const { trip, visits } = data
  const byDay = groupByDay(visits)
  const days = Array.from(byDay.entries())
  const totalPhotos = visits.reduce((acc, v) => acc + v.photos.length, 0)

  return (
    <div className="px-4 py-6 space-y-6">
      {/* ヘッダー */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{trip.title}</h1>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {trip.start_date} 〜 {trip.end_date}
        </div>
        <div className="flex gap-4 mt-3 text-sm text-gray-600 dark:text-gray-300">
          <span>📷 {totalPhotos}枚</span>
          <span>📍 {visits.length}施設</span>
        </div>
      </div>

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
                <div key={visit.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                  <Link
                    href={`/places/${visit.place_id}`}
                    className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-100 dark:border-slate-700"
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
                  <div className="p-3">
                    <div className="flex gap-1 overflow-x-auto">
                      {visit.photos.slice(0, 8).map((photo) => (
                        <div key={photo.id} className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden">
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
      </div>
    </div>
  )
}
