export interface Photo {
  id: string
  image_url: string
  taken_at: string
  lat: number | null
  lng: number | null
  group_id: string | null
  visit_id: string | null
}

export interface Place {
  id: string
  name: string
  lat: number
  lng: number
  created_from: 'auto' | 'manual'
}

export interface GroupPlaceCandidate {
  place_id: string
  score: number
  place: Place
}

export interface Group {
  id: string
  center_lat: number
  center_lng: number
  time_start: string
  time_end: string
  selected_place_id: string | null
  status: 'draft' | 'confirmed'
  photos?: Photo[]
  place_candidates?: GroupPlaceCandidate[]
  selected_place?: Place | null
}

export interface Visit {
  id: string
  place_id: string
  trip_id: string
  visited_at_start: string
  visited_at_end: string
  place?: Place
  photos?: Photo[]
}

export interface Trip {
  id: string
  title: string
  start_date: string
  end_date: string
  visits?: Visit[]
}

export interface PhotoWithFile extends Omit<Photo, 'id' | 'image_url' | 'group_id' | 'visit_id'> {
  file: File
  preview: string
}
