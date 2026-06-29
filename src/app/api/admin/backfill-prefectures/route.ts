import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'
import { getPrefecture } from '@/lib/nominatim'

// GET /api/admin/backfill-prefectures
// prefecture が未設定の施設を1回あたり8件処理する
// Nominatim レート制限のため 1.1秒ずつ待機（8件 ≒ 9秒、Vercel制限内）
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const BATCH = 8

  const { data: places } = await supabase
    .from('places')
    .select('id, lat, lng')
    .eq('user_id', user.id)
    .is('prefecture', null)
    .limit(BATCH)

  if (!places || places.length === 0) {
    return NextResponse.json({ processed: 0, remaining: 0 })
  }

  let processed = 0
  for (const place of places) {
    const prefecture = await getPrefecture(place.lat, place.lng)
    if (prefecture) {
      await supabase.from('places').update({ prefecture }).eq('id', place.id)
    } else {
      // 取得失敗時は空文字でマーク（再試行しないよう）
      await supabase.from('places').update({ prefecture: '' }).eq('id', place.id)
    }
    processed++
    // Nominatim は 1リクエスト/秒の制限
    await new Promise((r) => setTimeout(r, 1100))
  }

  const { count: remaining } = await supabase
    .from('places')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('prefecture', null)

  return NextResponse.json({ processed, remaining: remaining ?? 0 })
}
