import Link from 'next/link'

interface Props {
  placeCount: number
  tripCount: number
  prefectureCount: number
}

export default function StatsBar({ placeCount, tripCount, prefectureCount }: Props) {
  return (
    <div className="flex gap-4">
      <Link href="/places" className="text-center hover:opacity-70 transition-opacity">
        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{placeCount}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">訪問施設</div>
      </Link>
      <div className="w-px bg-gray-200 dark:bg-slate-600" />
      <Link href="/trips" className="text-center hover:opacity-70 transition-opacity">
        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{tripCount}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">旅行</div>
      </Link>
      <div className="w-px bg-gray-200 dark:bg-slate-600" />
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{prefectureCount}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">都道府県</div>
      </div>
    </div>
  )
}
