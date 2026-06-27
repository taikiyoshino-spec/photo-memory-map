import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// PATCH /api/trips/[id] - 旅行タイトル・期間を更新
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { title, start_date, end_date } = await req.json()

  if (!title?.trim()) {
    return NextResponse.json({ error: '旅行タイトルが必要です' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('trips')
    .update({ title: title.trim(), start_date, end_date })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('trips PATCH error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ trip: data })
}
