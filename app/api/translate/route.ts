import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function isAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return false
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    return profile?.role === 'admin'
  } catch { return false }
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 })
  }
  const text = req.nextUrl.searchParams.get('text')
  const from = req.nextUrl.searchParams.get('from') || 'tr'
  const to   = req.nextUrl.searchParams.get('to')   || 'en'

  if (!text?.trim()) {
    return NextResponse.json({ error: 'Metin eksik.' }, { status: 400 })
  }
  if (!['tr', 'en'].includes(from) || !['tr', 'en'].includes(to)) {
    return NextResponse.json({ error: 'Geçersiz dil.' }, { status: 400 })
  }
  try {
    const url =
      `https://api.mymemory.translated.net/get` +
      `?q=${encodeURIComponent(text.trim())}&langpair=${from}|${to}`
    const res = await fetch(url)
    const data = await res.json()
    const translated = data?.responseData?.translatedText?.trim()
    return NextResponse.json({ translation: translated || '' })
  } catch (err) {
    console.error('translate error:', err)
    return NextResponse.json({ error: 'Çeviri başarısız.' }, { status: 500 })
  }
}