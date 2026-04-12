import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/* ---------------- AUTH ---------------- */
async function isAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
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

/* ---------------- TRANSLITERATION ---------------- */
function transliterate(syriac: string) {
  const map: Record<string, string> = {
    'ܐ': 'ʾ','ܒ': 'b','ܓ': 'g','ܕ': 'd','ܗ': 'h',
    'ܘ': 'w','ܙ': 'z','ܚ': 'ḥ','ܛ': 'ṭ','ܝ': 'y',
    'ܟ': 'k','ܠ': 'l','ܡ': 'm','ܢ': 'n','ܣ': 's',
    'ܥ': 'ʿ','ܦ': 'p','ܨ': 'ṣ','ܩ': 'q','ܪ': 'r',
    'ܫ': 'š','ܬ': 't',
  }

  return syriac.split('').map(c => map[c] || '').join('')
}

/* ---------------- MAIN ---------------- */
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 })
  }

  const syriac = req.nextUrl.searchParams.get('syriac')?.trim()

  if (!syriac) {
    return NextResponse.json(
      { error: 'Süryanice parametre eksik.' },
      { status: 400 }
    )
  }

  try {
    const res = await fetch(
      `https://sedra.bethmardutho.org/api/word/${encodeURIComponent(syriac)}.json`
    )

    if (!res.ok) {
      return NextResponse.json({
        sedra_found: false,
        syriac,
        transliteration: transliterate(syriac),
        english: '',
      })
    }

    const data = await res.json()

    if (!data?.[0]) {
      return NextResponse.json({
        sedra_found: false,
        syriac,
        transliteration: transliterate(syriac),
        english: '',
      })
    }

    const item = data[0]

    const finalSyriac = item.syriac || syriac
    const english = (item.glosses?.eng || [])[0] || ''

    return NextResponse.json({
      sedra_found: true,
      syriac: finalSyriac,
      transliteration: transliterate(item.stem || finalSyriac),
      english,
      lexeme_id: item.lexeme?.id || null,
      sedra_url: item.lexeme?.id
        ? `https://sedra.bethmardutho.org/lexeme/get/${item.lexeme.id}`
        : null,
      source: 'sedra'
    })

  } catch (err) {
    console.error('sedra error:', err)

    return NextResponse.json({
      sedra_found: false,
      syriac,
      transliteration: transliterate(syriac),
      english: '',
      error: 'Sedra API hatası.'
    })
  }
}