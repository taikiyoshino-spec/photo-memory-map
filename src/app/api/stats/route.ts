import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/stats - ホーム画面の統計情報 + 全Place一覧
export async function GET() {
  const [{ count: placeCount }, { count: tripCount }, { data: places }] = await Promise.all([
    supabase.from('places').select('*', { count: 'exact', head: true }),
    supabase.from('trips').select('*', { count: 'exact', head: true }),
    supabase.from('places').select('id, name, lat, lng'),
  ])

  // 都道府県数：Nominatimの逆ジオコーディングは重いので、Place座標から簡易推定（今後拡張）
  const prefectureCount = 0

  return NextResponse.json({
    placeCount: placeCount ?? 0,
    tripCount: tripCount ?? 0,
    prefectureCount,
    places: places ?? [],
  })
}
