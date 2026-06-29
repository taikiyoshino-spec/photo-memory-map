import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'

// POST /api/photos/record - StorageにアップロードされたURLをDBに記録
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { image_url, taken_at, lat, lng } = await req.json()

  if (!image_url) {
    return NextResponse.json({ error: 'image_url required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('photos')
    .insert({
      image_url,
      taken_at: taken_at ?? new Date().toISOString(),
      lat: lat ?? null,
      lng: lng ?? null,
      user_id: user.id,
    })
    .select('id, image_url, taken_at, lat, lng')
    .single()

  if (error) {
    console.error('photos record error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ photo: data })
}
