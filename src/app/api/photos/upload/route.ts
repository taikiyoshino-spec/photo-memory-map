import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// FormData: files + EXIF metadata per file
// files[]: File
// meta[]: JSON string { name, takenAt, lat, lng }
export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const files = formData.getAll('files') as File[]
  const metaStrings = formData.getAll('meta') as string[]

  if (!files.length) {
    return NextResponse.json({ error: 'no files' }, { status: 400 })
  }

  const results: { id: string; image_url: string; taken_at: string; lat: number | null; lng: number | null }[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const meta = metaStrings[i] ? JSON.parse(metaStrings[i]) : {}

    const ext = file.name.split('.').pop() ?? 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(fileName, file, { contentType: file.type })

    if (uploadError) {
      console.error('Storage upload error:', uploadError.message)
      continue
    }

    const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName)

    const { data: photo, error: dbError } = await supabase
      .from('photos')
      .insert({
        image_url: urlData.publicUrl,
        taken_at: meta.takenAt ?? new Date().toISOString(),
        lat: meta.lat ?? null,
        lng: meta.lng ?? null,
      })
      .select('id, image_url, taken_at, lat, lng')
      .single()

    if (photo) results.push(photo)
  }

  return NextResponse.json({ photos: results })
}
