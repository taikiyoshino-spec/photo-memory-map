import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'

// POST /api/groups/confirm
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { groups, trip } = await req.json()

  // 1. Tripを取得または作成
  let tripId: string
  if (trip.id) {
    tripId = trip.id
  } else {
    const { data: newTrip, error } = await supabase
      .from('trips')
      .insert({ title: trip.title, start_date: trip.startDate, end_date: trip.endDate, user_id: user.id })
      .select('id')
      .single()
    if (error || !newTrip) {
      console.error('trip creation failed:', error)
      return NextResponse.json({ error: 'trip creation failed', detail: error?.message }, { status: 500 })
    }
    tripId = newTrip.id
  }

  if (!groups || groups.length === 0) {
    return NextResponse.json({ tripId, visitIds: [], warning: 'no groups with place selected' })
  }

  // 2. 各Groupを処理
  const visitIds: string[] = []
  const errors: string[] = []

  for (const g of groups) {
    if (!g.placeId) continue

    const { data: group, error: groupErr } = await supabase
      .from('groups')
      .insert({
        center_lat: g.centerLat ?? 0,
        center_lng: g.centerLng ?? 0,
        time_start: g.timeStart,
        time_end: g.timeEnd,
        selected_place_id: g.placeId,
        status: 'confirmed',
        user_id: user.id,
      })
      .select('id')
      .single()

    if (groupErr || !group) {
      console.error('group insert failed:', groupErr)
      errors.push(`group insert: ${groupErr?.message}`)
      continue
    }

    const { data: visit, error: visitErr } = await supabase
      .from('visits')
      .insert({
        place_id: g.placeId,
        trip_id: tripId,
        visited_at_start: g.timeStart,
        visited_at_end: g.timeEnd,
      })
      .select('id')
      .single()

    if (visitErr || !visit) {
      console.error('visit insert failed:', visitErr)
      errors.push(`visit insert: ${visitErr?.message}`)
      continue
    }

    visitIds.push(visit.id)

    if (g.photoIds && g.photoIds.length > 0) {
      const { error: photoErr } = await supabase
        .from('photos')
        .update({ group_id: group.id, visit_id: visit.id })
        .in('id', g.photoIds)
      if (photoErr) console.error('photo update failed:', photoErr)
    }
  }

  if (errors.length > 0 && visitIds.length === 0) {
    return NextResponse.json({ error: 'all group saves failed', details: errors }, { status: 500 })
  }

  return NextResponse.json({ tripId, visitIds, errors: errors.length ? errors : undefined })
}
