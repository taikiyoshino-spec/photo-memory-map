import { notFound, redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUserFromCookies } from '@/lib/auth'
import TripDetailClient from '@/components/TripDetailClient'
import { Photo } from '@/types'

export const dynamic = 'force-dynamic'

interface PlaceData { id: string; name: string; lat: number; lng: number }
interface VisitData {
  id: string
  place_id: string
  visited_at_start: string
  visited_at_end: string
  places: PlaceData | null
  photos: Photo[]
}

async function getTripData(id: string, userId: string) {
  const { data: trip } = await supabase
    .from('trips')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()
  if (!trip) return null

  const { data: visits } = await supabase
    .from('visits')
    .select('id, place_id, visited_at_start, visited_at_end, places ( id, name, lat, lng )')
    .eq('trip_id', id)
    .order('visited_at_start')

  const visitsWithPhotos: VisitData[] = []
  for (const v of visits ?? []) {
    const { data: photos } = await supabase
      .from('photos')
      .select('*')
      .eq('visit_id', v.id)
      .order('taken_at')

    visitsWithPhotos.push({
      id: v.id,
      place_id: v.place_id,
      visited_at_start: v.visited_at_start,
      visited_at_end: v.visited_at_end,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      places: (v as any).places ?? null,
      photos: photos ?? [],
    })
  }

  return { trip, visits: visitsWithPhotos }
}

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromCookies()
  if (!user) redirect('/login')

  const { id } = await params
  const data = await getTripData(id, user.id)
  if (!data) notFound()

  return <TripDetailClient trip={data.trip} visits={data.visits} />
}
