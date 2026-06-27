export interface NominatimPlace {
  place_id: number
  display_name: string
  name: string
  lat: string
  lon: string
  type: string
  category: string
}

export async function searchNearbyPlaces(lat: number, lng: number): Promise<NominatimPlace[]> {
  // Overpass API で半径800m以内の観光・施設系 POI を検索
  const query = [
    '[out:json][timeout:5];',
    '(',
    `node["name"]["amenity"](around:800,${lat},${lng});`,
    `node["name"]["tourism"](around:800,${lat},${lng});`,
    `node["name"]["leisure"](around:800,${lat},${lng});`,
    `way["name"]["amenity"](around:800,${lat},${lng});`,
    `way["name"]["tourism"](around:800,${lat},${lng});`,
    ');',
    'out center 10;',
  ].join('')

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
      headers: { 'Content-Type': 'text/plain', 'User-Agent': 'photo-memory-map/1.0' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.elements ?? [])
      .map((el: { id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }) => {
        const elLat = el.lat ?? el.center?.lat
        const elLon = el.lon ?? el.center?.lon
        if (!elLat || !elLon) return null
        return {
          place_id: el.id,
          display_name: el.tags?.name ?? '',
          name: el.tags?.name ?? '',
          lat: String(elLat),
          lon: String(elLon),
          type: el.tags?.amenity ?? el.tags?.tourism ?? el.tags?.leisure ?? '',
          category: el.tags?.amenity ? 'amenity' : el.tags?.tourism ? 'tourism' : 'leisure',
        }
      })
      .filter((p: NominatimPlace | null): p is NominatimPlace => !!p?.name)
  } catch {
    return []
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.searchParams.set('format', 'json')
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lng))
  url.searchParams.set('accept-language', 'ja')
  url.searchParams.set('zoom', '16') // 施設・地区レベル

  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'photo-memory-map/1.0 (personal travel app)' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json()
    // name → suburb → city_district → city の優先順で取得
    const addr = data.address ?? {}
    return (
      (data.name as string) ||
      addr.tourism ||
      addr.leisure ||
      addr.amenity ||
      addr.suburb ||
      addr.city_district ||
      addr.city ||
      (data.display_name as string) ||
      null
    )
  } catch {
    return null
  }
}
