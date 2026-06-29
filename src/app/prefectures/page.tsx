import Link from 'next/link'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUserFromCookies } from '@/lib/auth'

export const dynamic = 'force-dynamic'

async function getPlacesByPrefecture(userId: string) {
  const { data: places } = await supabase
    .from('places')
    .select('id, name, prefecture')
    .eq('user_id', userId)
    .order('name')

  const map = new Map<string, { id: string; name: string }[]>()
  const unknown: { id: string; name: string }[] = []

  for (const p of places ?? []) {
    if (!p.prefecture) {
      unknown.push({ id: p.id, name: p.name })
    } else {
      if (!map.has(p.prefecture)) map.set(p.prefecture, [])
      map.get(p.prefecture)!.push({ id: p.id, name: p.name })
    }
  }

  // 施設数が多い順にソート
  const sorted = Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length)
  return { sorted, unknown }
}

export default async function PrefecturesPage() {
  const user = await getUserFromCookies()
  if (!user) redirect('/login')

  const { sorted, unknown } = await getPlacesByPrefecture(user.id)
  const total = sorted.length + (unknown.length > 0 ? 1 : 0)

  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        都道府県別
        <span className="ml-2 text-base font-normal text-gray-400 dark:text-gray-500">
          {sorted.length}都道府県
        </span>
      </h1>

      {total === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 dark:text-gray-500 mb-2">施設がありません</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            都道府県情報がない場合は 🔧 デバッグページから更新できます
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map(([prefecture, places]) => (
            <div
              key={prefecture}
              className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                <span className="font-semibold text-gray-900 dark:text-white">{prefecture}</span>
                <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                  {places.length}施設
                </span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-slate-700">
                {places.map((place) => (
                  <Link
                    key={place.id}
                    href={`/places/${place.id}`}
                    className="block px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    📍 {place.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {unknown.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                <span className="font-semibold text-gray-500 dark:text-gray-400">都道府県不明</span>
                <span className="text-sm text-gray-400 font-medium">{unknown.length}施設</span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-slate-700">
                {unknown.map((place) => (
                  <Link
                    key={place.id}
                    href={`/places/${place.id}`}
                    className="block px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    📍 {place.name}
                  </Link>
                ))}
              </div>
              <div className="px-4 py-2 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-slate-700/50">
                🔧 デバッグページの「都道府県情報を更新」で取得できます
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
