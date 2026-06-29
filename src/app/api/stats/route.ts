import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/stats - ホーム画面の統計情報 + 全Place一覧
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ count: placeCount }, { count: tripCount }, { data: places }] = await Promise.all([
    supabase.from('places').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('trips').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('places').select('id, name, lat, lng').eq('user_id', user.id),
  ])

  return NextResponse.json({
    placeCount: placeCount ?? 0,
    tripCount: tripCount ?? 0,
    prefectureCount: 0,
    places: places ?? [],
  })
}
