import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'

// DELETE /api/visits/[id] - Visitを削除（写真はvisit_idをnullに）
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // tripのuser_idを確認
  const { data: visit } = await supabase.from('visits').select('trip_id').eq('id', id).single()
  if (visit) {
    const { data: trip } = await supabase.from('trips').select('user_id').eq('id', visit.trip_id).single()
    if (!trip || trip.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { error: photoErr } = await supabase
    .from('photos')
    .update({ visit_id: null })
    .eq('visit_id', id)

  if (photoErr) {
    console.error('photos unlink error:', photoErr)
    return NextResponse.json({ error: photoErr.message }, { status: 500 })
  }

  const { error } = await supabase.from('visits').delete().eq('id', id)
  if (error) {
    console.error('visits DELETE error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
