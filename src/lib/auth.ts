import { createServerClient } from '@supabase/ssr'
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

function makeSupabaseClient(
  getCookies: () => { name: string; value: string }[],
  setCookie?: (name: string, value: string, options: object) => void
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: getCookies,
        setAll: (cookiesToSet) =>
          cookiesToSet.forEach(({ name, value, options }) => setCookie?.(name, value, options)),
      },
    }
  )
}

// API routes (NextRequest) 用
export async function getUserFromRequest(req: NextRequest) {
  const client = makeSupabaseClient(() => req.cookies.getAll())
  const { data: { user } } = await client.auth.getUser()
  return user
}

// Server components (next/headers cookies) 用
export async function getUserFromCookies() {
  const cookieStore = await cookies()
  const client = makeSupabaseClient(
    () => cookieStore.getAll(),
    (name, value, options) => {
      try { cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2]) } catch {}
    }
  )
  const { data: { user } } = await client.auth.getUser()
  return user
}
