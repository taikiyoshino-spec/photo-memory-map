import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'

// POST /api/places - 新規施設作成
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name } = body
  const lat = typeof body.lat === 'number' ? body.lat : parseFloat(body.lat)
  const lng = typeof body.lng === 'number' ? body.lng : parseFloat(body.lng)

  if (!name || !name.trim()) {
    return NextResponse.json({ error: '施設名が必要です' }, { status: 400 })
  }
  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'GPS情報が取得できませんでした。GPS付き写真でお試しください。' }, { status: 400 })
  }

  // 重複チェック（同ユーザー・同名・近隣）
  const delta = 0.009
  const { data: existing } = await supabase
    .from('places')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', name.trim())
    .gte('lat', lat - delta)
    .lte('lat', lat + delta)
    .gte('lng', lng - delta)
    .lte('lng', lng + delta)
    .limit(1)
    .single()

  if (existing) {
    return NextResponse.json({ place: existing })
  }

  const { data, error } = await supabase
    .from('places')
    .insert({ name: name.trim(), lat, lng, created_from: 'manual', user_id: user.id })
    .select()
    .single()

  if (error) {
    console.error('places insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ place: data })
}
