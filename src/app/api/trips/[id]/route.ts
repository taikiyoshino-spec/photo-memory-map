import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'

// DELETE /api/trips/[id] - 旅行・visit・写真（Storage含む）を完全削除
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // 所有確認
  const { data: trip } = await supabase
    .from('trips')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!trip) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // この旅行に紐づく全 visit の写真を取得
  const { data: visits } = await supabase
    .from('visits')
    .select('id')
    .eq('trip_id', id)

  const visitIds = (visits ?? []).map((v) => v.id)

  if (visitIds.length > 0) {
    const { data: photos } = await supabase
      .from('photos')
      .select('image_url')
      .in('visit_id', visitIds)

    // Storage から写真ファイルを削除
    const storageKeys = (photos ?? [])
      .map((p) => {
        try {
          const url = new URL(p.image_url)
          const parts = url.pathname.split('/public/photos/')
          return parts.length === 2 ? parts[1] : null
        } catch {
          return null
        }
      })
      .filter((k): k is string => k !== null)

    if (storageKeys.length > 0) {
      await supabase.storage.from('photos').remove(storageKeys)
    }

    // DB の写真を削除
    await supabase.from('photos').delete().in('visit_id', visitIds)

    // visit を削除
    await supabase.from('visits').delete().eq('trip_id', id)
  }

  // 旅行本体を削除
  const { error } = await supabase.from('trips').delete().eq('id', id)
  if (error) {
    console.error('trips DELETE error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// PATCH /api/trips/[id] - 旅行タイトル・期間を更新
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { title, start_date, end_date } = await req.json()

  if (!title?.trim()) {
    return NextResponse.json({ error: '旅行タイトルが必要です' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('trips')
    .update({ title: title.trim(), start_date, end_date })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('trips PATCH error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ trip: data })
}
