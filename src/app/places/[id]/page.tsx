import { notFound, redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUserFromCookies } from '@/lib/auth'
import PlaceDetailClient from '@/components/PlaceDetailClient'
import { Visit, Photo, Trip } from '@/types'

export const dynamic = 'force-dynamic'

interface VisitWithTrip extends Visit {
  trip: Trip
  photos: Photo[]
}

async function getPlaceData(id: string, userId: string) {
  const { data: place } = await supabase
    .from('places')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()
  if (!place) return null

  const { data: visits } = await supabase
    .from('visits')
    .select(`
      id, visited_at_start, visited_at_end, trip_id,
      trips ( id, title, start_date, end_date )
    `)
    .eq('place_id', id)
    .order('visited_at_start', { ascending: false })

  const visitsWithPhotos: VisitWithTrip[] = []

  for (const v of visits ?? []) {
    const { data: photos } = await supabase
      .from('photos')
      .select('*')
      .eq('visit_id', v.id)

    visitsWithPhotos.push({
      ...v,
      place_id: id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      trip: (v as any).trips as Trip,
      photos: photos ?? [],
    })
  }

  return { place, visits: visitsWithPhotos }
}

export default async function PlacePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromCookies()
  if (!user) redirect('/login')

  const { id } = await params
  const data = await getPlaceData(id, user.id)
  if (!data) notFound()

  return <PlaceDetailClient place={data.place} visits={data.visits} />
}
