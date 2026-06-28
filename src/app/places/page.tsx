import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

async function getPlacesList() {
  const [{ data: places }, { data: visits }] = await Promise.all([
    supabase.from('places').select('id, name, lat, lng'),
    supabase.from('visits').select('place_id, visited_at_start'),
  ])

  const visitMap = new Map<string, { count: number; lastVisit: string }>()
  for (const v of visits ?? []) {
    const existing = visitMap.get(v.place_id)
    if (!existing) {
      visitMap.set(v.place_id, { count: 1, lastVisit: v.visited_at_start })
    } else {
      existing.count++
      if (v.visited_at_start > existing.lastVisit) existing.lastVisit = v.visited_at_start
    }
  }

  return (places ?? [])
    .map(p => ({
      ...p,
      visitCount: visitMap.get(p.id)?.count ?? 0,
      lastVisit: visitMap.get(p.id)?.lastVisit ?? null,
    }))
    .sort((a, b) => {
      if (!a.lastVisit && !b.lastVisit) return 0
      if (!a.lastVisit) return 1
      if (!b.lastVisit) return -1
      return b.lastVisit.localeCompare(a.lastVisit)
    })
}

export default async function PlacesPage() {
  const places = await getPlacesList()

  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        訪問施設一覧
        <span className="ml-2 text-base font-normal text-gray-400 dark:text-gray-500">{places.length}件</span>
      </h1>

      {places.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 dark:text-gray-500 mb-4">訪問施設がありません</p>
          <Link
            href="/upload"
            className="text-sm bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
          >
            写真をアップロードして施設を追加
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {places.map(place => (
            <Link
              key={place.id}
              href={`/places/${place.id}`}
              className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 hover:border-blue-300 dark:hover:border-blue-500 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-white truncate">{place.name}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {place.lastVisit
                    ? `最終訪問: ${new Date(place.lastVisit).toLocaleDateString('ja-JP')}`
                    : '訪問記録なし'}
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{place.visitCount}</div>
                <div className="text-xs text-gray-400 dark:text-gray-500">回訪問</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
