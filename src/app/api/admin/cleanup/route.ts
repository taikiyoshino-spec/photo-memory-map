import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/admin/cleanup
// - Vercel Cron から呼ばれる場合: Authorization: Bearer {CRON_SECRET}
// - ユーザーが手動で呼ぶ場合: ログインセッションが必要
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const isCron = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`

  if (!isCron) {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // visit_id が null かつ 24時間以上前の写真を孤立写真とみなす
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: orphaned, error: fetchErr } = await supabase
    .from('photos')
    .select('id, image_url')
    .is('visit_id', null)
    .lt('taken_at', cutoff)

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  if (!orphaned || orphaned.length === 0) {
    return NextResponse.json({ deleted: 0, message: '孤立写真はありません' })
  }

  let deleted = 0
  let storageErrors = 0

  for (const photo of orphaned) {
    // Storage からファイルを削除
    try {
      const url = new URL(photo.image_url)
      const pathParts = url.pathname.split('/public/photos/')
      if (pathParts.length === 2) {
        const { error: storageErr } = await supabase.storage
          .from('photos')
          .remove([pathParts[1]])
        if (storageErr) storageErrors++
      }
    } catch {
      storageErrors++
    }

    // DB レコードを削除
    await supabase.from('photos').delete().eq('id', photo.id)
    deleted++
  }

  console.log(`cleanup: deleted ${deleted} orphaned photos (${storageErrors} storage errors)`)
  return NextResponse.json({
    deleted,
    storageErrors,
    message: `${deleted}枚の孤立写真を削除しました`,
  })
}
