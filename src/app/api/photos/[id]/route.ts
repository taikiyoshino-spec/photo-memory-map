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

// DELETE /api/photos/[id] - DBレコードとStorageファイルを完全削除
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // まずDBからURLを取得
  const { data: photo, error: fetchErr } = await supabase
    .from('photos')
    .select('image_url')
    .eq('id', id)
    .single()

  if (fetchErr || !photo) {
    return NextResponse.json({ error: 'photo not found' }, { status: 404 })
  }

  // StorageのファイルパスをURLから抽出
  // URL形式: https://xxx.supabase.co/storage/v1/object/public/photos/filename.jpg
  const url = new URL(photo.image_url)
  const pathParts = url.pathname.split('/public/photos/')
  if (pathParts.length === 2) {
    const fileName = pathParts[1]
    const { error: storageErr } = await supabase.storage.from('photos').remove([fileName])
    if (storageErr) {
      console.error('storage delete error:', storageErr)
      // Storageの削除に失敗してもDBレコードは削除を続行
    }
  }

  // DBレコード削除
  const { error: dbErr } = await supabase.from('photos').delete().eq('id', id)
  if (dbErr) {
    console.error('photos DELETE error:', dbErr)
    return NextResponse.json({ error: dbErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
