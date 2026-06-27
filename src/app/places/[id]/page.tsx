import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Visit, Photo, Trip } from '@/types'

export const dynamic = 'force-dynamic'

interface VisitWithTrip extends Visit {
  trip: Trip
}

async function getPlaceData(id: string) {
  const { data: place } = await supabase.from('places').select('*').eq('id', id).single()
  if (!place) return null

  const { data: visits } = await supabase
    .from('visits')
    .select(`
      id, visited_at_start, visited_at_end, trip_id,
      trips ( id, title, start_date, end_date )
    `)
    .eq('place_id', id)
    .order('visited_at_start', { ascending: false })

  const visitsWithPhotos: (VisitWithTrip & { photos: Photo[] })[] = []

  for (const v of visits ?? []) {
    const { data: photos } = await supabase
      .from('photos')
      .select('*')
      .eq('visit_id', v.id)

    visitsWithPhotos.push({
      ...v,
      place_id: id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      trip: (v as any).trips as Trip,
      photos: photos ?? [],
    })
  }

  return { place, visits: visitsWithPhotos }
}

export default async function PlacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getPlaceData(id)
  if (!data) notFound()

  const { place, visits } = data
  const mainPhoto = visits[0]?.photos[0]

  return (
    <div className="px-4 py-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-start gap-4">
        {mainPhoto && (
          <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
            <img src={mainPhoto.image_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{place.name}</h1>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">訪問 {visits.length} 回</div>
        </div>
      </div>

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
  )
}
