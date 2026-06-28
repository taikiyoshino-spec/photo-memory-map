import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// PATCH /api/places/[id] - 施設名・位置情報を更新
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    .select()
    .single()

  if (error) {
    console.error('places PATCH error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ place: data })
}
