'use client'

import { useState } from 'react'
import exifr from 'exifr'

export default function DebugPage() {
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setResult(null)

    try {
      // すべてのセグメントを解析
      const raw = await exifr.parse(file, {
        gps: true,
        exif: true,
        tiff: true,
        iptc: false,
        xmp: false,
      })

      // GPS 専用 API の結果
      const gpsResult = await exifr.gps(file).catch((e: unknown) => ({ error: String(e) }))

      const gpsFields: Record<string, unknown> = {}
      const allFields: Record<string, unknown> = {}

      if (raw) {
        for (const [k, v] of Object.entries(raw)) {
          allFields[k] = v
          if (k.toLowerCase().startsWith('gps') || k === 'latitude' || k === 'longitude') {
            gpsFields[k] = v
          }
        }
      }

      const report = {
        fileName: file.name,
        fileSize: `${(file.size / 1024).toFixed(1)} KB`,
        fileType: file.type,
        exifrGps: gpsResult,
        gpsFields,
        allFieldNames: Object.keys(allFields),
      }

      setResult(JSON.stringify(report, null, 2))
    } catch (err) {
      setResult(`エラー: ${String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  const [cleanupResult, setCleanupResult] = useState<string | null>(null)
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [prefectureResult, setPrefectureResult] = useState<string | null>(null)
  const [prefectureLoading, setPrefectureLoading] = useState(false)

  const handleBackfillPrefectures = async () => {
    setPrefectureLoading(true)
    setPrefectureResult(null)
    let total = 0
    try {
      while (true) {
        const res = await fetch('/api/admin/backfill-prefectures')
        const json = await res.json()
        total += json.processed ?? 0
        if (json.remaining === 0) break
        setPrefectureResult(`処理中... ${total}件完了、残り${json.remaining}件`)
      }
      setPrefectureResult(`完了: ${total}件の都道府県情報を更新しました`)
    } catch (e) {
      setPrefectureResult(`エラー: ${String(e)}`)
    } finally {
      setPrefectureLoading(false)
    }
  }

  const handleCleanup = async () => {
    if (!confirm('visit に紐づいていない写真（24時間以上前）を削除します。よろしいですか？')) return
    setCleanupLoading(true)
    setCleanupResult(null)
    try {
      const res = await fetch('/api/admin/cleanup')
      const json = await res.json()
      setCleanupResult(json.message ?? JSON.stringify(json))
    } catch (e) {
      setCleanupResult(`エラー: ${String(e)}`)
    } finally {
      setCleanupLoading(false)
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-8">
      {/* 都道府県バックフィル */}
      <div>
        <h1 className="text-lg font-bold mb-2">都道府県情報を更新</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          都道府県が未設定の施設を Nominatim で一括取得します（施設数×約1秒かかります）。
        </p>
        <button
          onClick={handleBackfillPrefectures}
          disabled={prefectureLoading}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {prefectureLoading ? '取得中...' : '🗾 都道府県を一括取得'}
        </button>
        {prefectureResult && (
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{prefectureResult}</p>
        )}
      </div>

      <hr className="border-gray-200 dark:border-slate-700" />

      {/* 孤立写真クリーンアップ */}
      <div>
        <h1 className="text-lg font-bold mb-2">孤立写真クリーンアップ</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          どの訪問にも紐づいていない写真（アップロードから24時間以上経過）をStorageとDBから削除します。
        </p>
        <button
          onClick={handleCleanup}
          disabled={cleanupLoading}
          className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {cleanupLoading ? '削除中...' : '🗑 孤立写真を今すぐ削除'}
        </button>
        {cleanupResult && (
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{cleanupResult}</p>
        )}
      </div>

      <hr className="border-gray-200 dark:border-slate-700" />

      <h2 className="text-lg font-bold mb-4">EXIF 診断ツール</h2>
      <p className="text-sm text-gray-500 mb-4">GPS付きのAndroid写真を1枚選んでください。</p>
      <input type="file" accept="image/*" onChange={handleFile} className="mb-4 block" />
      {loading && <p className="text-sm text-gray-500">解析中...</p>}
      {result && (
        <pre className="text-xs bg-gray-100 dark:bg-slate-800 p-3 rounded overflow-auto whitespace-pre-wrap break-all border">
          {result}
        </pre>
      )}
      </div>
    </div>
  )
}
