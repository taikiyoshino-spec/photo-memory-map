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

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-lg font-bold mb-4">EXIF 診断ツール</h1>
      <p className="text-sm text-gray-500 mb-4">GPS付きのAndroid写真を1枚選んでください。</p>
      <input type="file" accept="image/*" onChange={handleFile} className="mb-4 block" />
      {loading && <p className="text-sm text-gray-500">解析中...</p>}
      {result && (
        <pre className="text-xs bg-gray-100 dark:bg-slate-800 p-3 rounded overflow-auto whitespace-pre-wrap break-all border">
          {result}
        </pre>
      )}
    </div>
  )
}
