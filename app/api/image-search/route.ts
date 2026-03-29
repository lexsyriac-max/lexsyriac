import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ─── Admin kontrolü ──────────────────────────────────────────────────────────

async function isAdmin(req: NextRequest): Promise<boolean> {
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
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    return profile?.role === 'admin'
  } catch {
    return false
  }
}

// ─── Wikimedia Commons ────────────────────────────────────────────────────────

async function fetchWikimedia(query: string) {
  const url =
    `https://commons.wikimedia.org/w/api.php` +
    `?action=query&generator=search&gsrnamespace=6` +
    `&gsrsearch=${encodeURIComponent(query)}` +
    `&gsrlimit=9&prop=imageinfo&iiprop=url|size|mime` +
    `&iiurlwidth=400&format=json&origin=*`

  const res = await fetch(url, { next: { revalidate: 3600 } })
  const data = await res.json()
  const pages = data?.query?.pages || {}

  return Object.values(pages as Record<string, {
    imageinfo?: { thumburl: string; url: string }[]
  }>)
    .filter((p) => p.imageinfo?.[0]?.thumburl)
    .map((p) => ({
      url: p.imageinfo![0].url,
      thumb: p.imageinfo![0].thumburl,
      source: 'wikimedia',
    }))
    .slice(0, 6)
}

// ─── Pixabay ──────────────────────────────────────────────────────────────────

async function fetchPixabay(query: string) {
  const apiKey = process.env.PIXABAY_API_KEY
  if (!apiKey) return []

  const url =
    `https://pixabay.com/api/?key=${apiKey}` +
    `&q=${encodeURIComponent(query)}&image_type=photo&per_page=9&safesearch=true`

  const res = await fetch(url, { next: { revalidate: 3600 } })
  const data = await res.json()

  return (data?.hits || [])
    .slice(0, 6)
    .map((h: { webformatURL: string; previewURL: string }) => ({
      url: h.webformatURL,
      thumb: h.previewURL,
      source: 'pixabay',
    }))
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Admin kontrolü
  const adminOk = await isAdmin(req)
  if (!adminOk) {
    return NextResponse.json(
      { error: 'Yetkisiz erişim. Admin girişi gereklidir.' },
      { status: 401 }
    )
  }

  const query = req.nextUrl.searchParams.get('q')
  if (!query?.trim()) {
    return NextResponse.json({ error: 'Sorgu parametresi eksik.' }, { status: 400 })
  }

  // Sorgu temizle: "to write" → "write", "apple/elma" → "apple"
  const cleanQuery = query
    .replace(/^to\s+/i, '')
    .split(/[/,]/)[0]
    .trim()
    .toLowerCase()

  try {
    // Önce Wikimedia dene
    let results = await fetchWikimedia(cleanQuery)

    // Wikimedia boşsa Pixabay dene
    if (!results.length) {
      results = await fetchPixabay(cleanQuery)
    }

    return NextResponse.json({ results, query: cleanQuery })
  } catch (err) {
    console.error('image-search error:', err)
    return NextResponse.json({ error: 'Görsel arama başarısız.' }, { status: 500 })
  }
}