import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// DELETE /api/visits/[id] - Visitを削除（写真はvisit_idをnullに）
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // 写真のvisit_idを切り離す（写真自体は消さない）
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
