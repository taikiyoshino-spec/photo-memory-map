'use client'

import { useState } from 'react'
import { Trip } from '@/types'

interface Props {
  trips: Trip[]
  onSelect: (tripId: string) => void
  onCreateNew: (title: string, startDate: string, endDate: string) => void
  defaultStartDate?: string
  defaultEndDate?: string
}

export default function TripSelector({ trips, onSelect, onCreateNew, defaultStartDate, defaultEndDate }: Props) {
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState(defaultStartDate ?? '')
  const [endDate, setEndDate] = useState(defaultEndDate ?? '')
  const [validationError, setValidationError] = useState('')

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">旅行を選択または作成</div>

      {trips.map((trip) => (
        <button
          key={trip.id}
          onClick={() => onSelect(trip.id)}
          className="w-full text-left px-3 py-2 rounded-lg text-sm bg-gray-100 hover:bg-blue-50 hover:text-blue-700 transition-colors dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-gray-200 dark:hover:text-blue-300"
        >
          <div className="font-medium">{trip.title}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{trip.start_date} 〜 {trip.end_date}</div>
        </button>
      ))}

      {!showCreate ? (
        <button
          onClick={() => setShowCreate(true)}
          className="w-full text-left px-3 py-2 rounded-lg text-sm bg-gray-50 hover:bg-gray-100 text-gray-500 border border-dashed border-gray-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-gray-400 dark:border-slate-600"
        >
          + 新しい旅行を作成
        </button>
      ) : (
        <div className="border border-gray-200 dark:border-slate-600 rounded-lg p-3 space-y-2">
          <input
            type="text"
            placeholder="旅行タイトル（例：千葉家族旅行）"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-gray-400"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
            <span className="self-center text-gray-400">〜</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
          </div>
          {validationError && (
            <div className="text-xs text-red-500 dark:text-red-400">{validationError}</div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (!title.trim()) { setValidationError('旅行タイトルを入力してください'); return }
                if (!startDate || !endDate) { setValidationError('開始日・終了日を選択してください'); return }
                setValidationError('')
                onCreateNew(title.trim(), startDate, endDate)
                setShowCreate(false)
              }}
              className="flex-1 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              作成して確定
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 dark:bg-slate-600 dark:text-gray-200 dark:hover:bg-slate-500"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
