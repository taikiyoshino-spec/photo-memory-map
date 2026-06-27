import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/trips - 旅行一覧
export async function GET() {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .order('start_date', { ascending: false })

  if (error) {
    console.error('trips GET error:', error)
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
  }
  return NextResponse.json({ trips: data })
}
