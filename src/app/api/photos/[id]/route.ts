import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// PATCH /api/photos/[id] - visit_id を更新（紐付け変更・解除）
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const update: Record<string, unknown> = {}
  if ('visit_id' in body) update.visit_id = body.visit_id ?? null

  const { data, error } = await supabase
    .from('photos')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('photos PATCH error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ photo: data })
}
