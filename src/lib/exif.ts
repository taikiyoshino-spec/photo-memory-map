import exifr from 'exifr'

export interface ExifData {
  lat: number | null
  lng: number | null
  takenAt: Date | null
}

function dmsToDecimal(dms: number[], ref: string): number | null {
  if (!Array.isArray(dms) || dms.length < 2) return null
  const d = dms[0] ?? 0
  const m = dms[1] ?? 0
  const s = dms[2] ?? 0
  if (!Number.isFinite(d) || !Number.isFinite(m)) return null
  const abs = d + m / 60 + (Number.isFinite(s) ? s : 0) / 3600
  if (!Number.isFinite(abs)) return null
  return ref === 'S' || ref === 'W' ? -abs : abs
}

export async function extractExif(file: File): Promise<ExifData> {
  try {
    // gps: true でGPS IFDをすべて読む。pick は使わない（Refタグが落ちるため）
    const data = await exifr.parse(file, { gps: true, exif: true })

    if (!data) return { lat: null, lng: null, takenAt: null }

    let lat: number | null = null
    let lng: number | null = null

    // 方法1: exifr が十進変換済みの latitude/longitude を持っていればそれを使う
    if (Number.isFinite(data.latitude) && Number.isFinite(data.longitude)) {
      lat = data.latitude as number
      lng = data.longitude as number
    }

    // 方法2: 生 DMS 配列 + Ref タグから手動変換（方法1がNaNになった場合のフォールバック）
    if (lat === null && Array.isArray(data.GPSLatitude) && Array.isArray(data.GPSLongitude)) {
      const latRef = typeof data.GPSLatitudeRef === 'string' ? data.GPSLatitudeRef : 'N'
      const lngRef = typeof data.GPSLongitudeRef === 'string' ? data.GPSLongitudeRef : 'E'
      const rawLat = dmsToDecimal(data.GPSLatitude as number[], latRef)
      const rawLng = dmsToDecimal(data.GPSLongitude as number[], lngRef)
      if (rawLat !== null && rawLng !== null) {
        lat = rawLat
        lng = rawLng
      }
    }

    // 方法3: exifr.gps() 専用 API（最終手段）
    if (lat === null) {
      const gps = await exifr.gps(file).catch(() => undefined)
      if (Number.isFinite(gps?.latitude) && Number.isFinite(gps?.longitude)) {
        lat = gps!.latitude
        lng = gps!.longitude
      }
    }

    const takenAt = (data.DateTimeOriginal ?? data.CreateDate) ?? null
    return {
      lat,
      lng,
      takenAt: takenAt instanceof Date ? takenAt : null,
    }
  } catch {
    return { lat: null, lng: null, takenAt: null }
  }
}
