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

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 })
  }

  const { english, turkish } = await req.json()
  if (!english && !turkish) {
    return NextResponse.json({ error: 'Kelime gerekli.' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Claude API key bulunamadı.' }, { status: 500 })
  }

  try {
    const prompt = `You are a Syriac language expert. Convert the following word to Classical Syriac (Estrangela script).

English: ${english || ''}
Turkish: ${turkish || ''}

Rules:
- Return ONLY the Syriac word in Estrangela script (e.g., ܟܬܒ)
- If multiple forms exist, return the most common dictionary form (3rd person singular past tense for verbs, absolute state for nouns)
- Return ONLY the Syriac characters, nothing else
- If you cannot translate, return "?"

Syriac word:`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 50,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Claude API hatası.' }, { status: 500 })
    }

    const data = await response.json()
    const syriac = data.content?.[0]?.text?.trim() || ''

    // Sadece Süryanice karakterler içeriyorsa kabul et
    const syriacRegex = /[\u0700-\u074F]/
    if (!syriacRegex.test(syriac) || syriac === '?') {
      return NextResponse.json({ syriac: null, message: 'Çeviri bulunamadı.' })
    }

    // Noktalama ve boşlukları temizle
    const cleanSyriac = syriac.replace(/[^\u0700-\u074F\u0730-\u074F]/g, '').trim()

    return NextResponse.json({
      syriac: cleanSyriac,
      source: 'claude',
    })
  } catch (err) {
    console.error('claude-syriac error:', err)
    return NextResponse.json({ error: 'Çeviri hatası.' }, { status: 500 })
  }
}