import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'

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
