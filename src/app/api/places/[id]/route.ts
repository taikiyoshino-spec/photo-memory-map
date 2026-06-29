import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'

// DELETE /api/places/[id] - 訪問記録のない施設を削除
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { count, error: countErr } = await supabase
    .from('visits')
    .select('id', { count: 'exact', head: true })
    .eq('place_id', id)

  if (countErr) {
    return NextResponse.json({ error: countErr.message }, { status: 500 })
  }
  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: '訪問記録があるため削除できません' }, { status: 400 })
  }

  const { error } = await supabase
    .from('places')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

// PATCH /api/places/[id] - 施設名・位置情報を更新
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { name, lat, lng } = await req.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: '施設名が必要です' }, { status: 400 })
  }

  const update: Record<string, unknown> = { name: name.trim() }
  if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
    update.lat = lat
    update.lng = lng
  }

  const { data, error } = await supabase
    .from('places')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('places PATCH error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ place: data })
}
