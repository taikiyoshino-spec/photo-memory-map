import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'

// POST /api/admin/migrate-user-data
// user_id が NULL の既存データを現在のユーザーに紐づける（初回マイグレーション用）
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const uid = user.id

  const [places, trips, photos, groups] = await Promise.all([
    supabase.from('places').update({ user_id: uid }).is('user_id', null).select('id'),
    supabase.from('trips').update({ user_id: uid }).is('user_id', null).select('id'),
    supabase.from('photos').update({ user_id: uid }).is('user_id', null).select('id'),
    supabase.from('groups').update({ user_id: uid }).is('user_id', null).select('id'),
  ])

  return NextResponse.json({
    updated: {
      places: places.data?.length ?? 0,
      trips: trips.data?.length ?? 0,
      photos: photos.data?.length ?? 0,
      groups: groups.data?.length ?? 0,
    },
  })
}
