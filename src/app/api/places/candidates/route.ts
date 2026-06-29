import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'
import { searchNearbyPlaces, reverseGeocode } from '@/lib/nominatim'
import { Place } from '@/types'

// GET /api/places/candidates?lat=...&lng=...
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const lat = parseFloat(searchParams.get('lat') ?? '')
  const lng = parseFloat(searchParams.get('lng') ?? '')

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'invalid lat/lng' }, { status: 400 })
  }

  const delta = 0.009

  // 自前DBから近隣Place検索（同ユーザーのみ）
  const { data: dbPlaces } = await supabase
    .from('places')
    .select('*')
    .eq('user_id', user.id)
    .gte('lat', lat - delta)
    .lte('lat', lat + delta)
    .gte('lng', lng - delta)
    .lte('lng', lng + delta)

  const allCandidates: Place[] = [...(dbPlaces ?? [])]

  // Nominatimで周辺スポットを検索
  const nominatimPlaces = await searchNearbyPlaces(lat, lng)
  for (const np of nominatimPlaces.slice(0, 5)) {
    const npLat = parseFloat(np.lat)
    const npLng = parseFloat(np.lon)
    if (!np.name || isNaN(npLat) || isNaN(npLng)) continue
    const exists = allCandidates.some((p) => p.name === np.name)
    if (!exists) {
      const { data } = await supabase
        .from('places')
        .insert({ name: np.name, lat: npLat, lng: npLng, created_from: 'auto', user_id: user.id })
        .select()
        .single()
      if (data) allCandidates.push(data)
    }
  }

  if (allCandidates.length === 0) {
    const geoName = await reverseGeocode(lat, lng)
    if (geoName) {
      const { data } = await supabase
        .from('places')
        .insert({ name: geoName, lat, lng, created_from: 'auto', user_id: user.id })
        .select()
        .single()
      if (data) allCandidates.push(data)
    }
  }

  return NextResponse.json({ places: allCandidates.slice(0, 5) })
}
