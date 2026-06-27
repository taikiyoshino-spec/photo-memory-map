import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

async function getTrips() {
  const { data } = await supabase
    .from('trips')
    .select('*')
    .order('start_date', { ascending: false })
  return data ?? []
}

export default async function TripsPage() {
  const trips = await getTrips()

  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">旅行一覧</h1>

      {trips.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 dark:text-gray-500 mb-4">まだ旅行記録がありません</p>
          <Link
            href="/upload"
            className="text-sm bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
          >
            写真をアップロードして旅行を作成
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => (
            <Link
              key={trip.id}
              href={`/trips/${trip.id}`}
              className="block bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 hover:border-blue-300 dark:hover:border-blue-500 transition-colors"
            >
              <div className="font-semibold text-gray-900 dark:text-white">{trip.title}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {trip.start_date} 〜 {trip.end_date}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
