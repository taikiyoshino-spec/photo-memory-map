import { PhotoWithFile } from '@/types'

const DISTANCE_THRESHOLD_KM = 1
const TIME_THRESHOLD_MS = 30 * 60 * 1000

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function photosAreClose(a: PhotoWithFile, b: PhotoWithFile): boolean {
  const timeDiff = Math.abs(new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime())
  const timeOk = timeDiff <= TIME_THRESHOLD_MS

  // 両方GPS情報あり → 距離+時間で判定
  if (a.lat && a.lng && b.lat && b.lng) {
    return haversineKm(a.lat, a.lng, b.lat, b.lng) <= DISTANCE_THRESHOLD_KM && timeOk
  }

  // 片方または両方GPS情報なし → 時間のみで判定
  return timeOk
}

export interface PhotoGroup {
  photos: PhotoWithFile[]
  centerLat: number | null
  centerLng: number | null
  timeStart: Date
  timeEnd: Date
  hasGps: boolean
}

export function groupPhotos(photos: PhotoWithFile[]): {
  groups: PhotoGroup[]
  ungrouped: PhotoWithFile[]
} {
  if (photos.length === 0) return { groups: [], ungrouped: [] }

  const sorted = [...photos].sort(
    (a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime()
  )

  const clusters: PhotoWithFile[][] = []
  const used = new Set<number>()

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) continue
    const cluster: PhotoWithFile[] = [sorted[i]]
    used.add(i)

    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(j)) continue
      if (cluster.some((p) => photosAreClose(p, sorted[j]))) {
        cluster.push(sorted[j])
        used.add(j)
      }
    }

    clusters.push(cluster)
  }

  const groups: PhotoGroup[] = clusters.map((cluster) => {
    const gpsPhotos = cluster.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    const times = cluster.map((p) => new Date(p.taken_at).getTime())
    const hasGps = gpsPhotos.length > 0

    const centerLat = hasGps
      ? gpsPhotos.reduce((s, p) => s + p.lat!, 0) / gpsPhotos.length
      : null
    const centerLng = hasGps
      ? gpsPhotos.reduce((s, p) => s + p.lng!, 0) / gpsPhotos.length
      : null

    return {
      photos: cluster,
      centerLat,
      centerLng,
      timeStart: new Date(Math.min(...times)),
      timeEnd: new Date(Math.max(...times)),
      hasGps,
    }
  })

  // 1枚のみで時間情報もない写真は未分類へ
  const ungrouped: PhotoWithFile[] = []
  const validGroups = groups.filter((g) => {
    if (g.photos.length === 1 && !g.hasGps) {
      ungrouped.push(g.photos[0])
      return false
    }
    return true
  })

  return { groups: validGroups, ungrouped }
}
