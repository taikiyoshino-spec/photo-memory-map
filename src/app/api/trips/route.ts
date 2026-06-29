import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserFromRequest } from '@/lib/auth'

// GET /api/trips - ログインユーザーの旅行一覧
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', user.id)
    .order('start_date', { ascending: false })

  if (error) {
    console.error('trips GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ trips: data })
}
