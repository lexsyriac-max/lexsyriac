import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

type LookupBody = {
  source: 'tr' | 'en'
  text: string
}

export async function POST(request: Request) {
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
          setAll() {
            // Route handler içinde session yazmıyoruz.
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Giriş gerekli.' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Yetkisiz işlem.' }, { status: 403 })
    }

    const body = (await request.json()) as LookupBody
    const source = body.source
    const text = body.text?.trim()

    if (!source || !text) {
      return NextResponse.json(
        { error: 'source ve text gerekli.' },
        { status: 400 }
      )
    }

    if (!['tr', 'en'].includes(source)) {
      return NextResponse.json(
        { error: 'Geçersiz source değeri.' },
        { status: 400 }
      )
    }

    const systemPrompt = `
You are a bilingual dictionary assistant for Turkish and English.
Return only valid JSON.
No markdown.
No explanation.

Rules:
- If source is "tr", translate Turkish to English.
- If source is "en", translate English to Turkish.
- Return a compact JSON object with exactly these keys:
  {
    "turkish": "...",
    "english": "..."
  }
- Use the most common dictionary form.
- Keep nouns singular when possible.
- Keep verbs in infinitive/base dictionary form when possible.
- Do not include extra keys.
`.trim()

    const userPrompt =
      source === 'tr'
        ? `source=tr\ntext=${text}`
        : `source=en\ntext=${text}`

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        temperature: 0,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    })

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text()
      return NextResponse.json(
        { error: `Anthropic hatası: ${errText}` },
        { status: 500 }
      )
    }

    const anthropicData = await anthropicResponse.json()
    const textBlock = anthropicData?.content?.find(
      (item: { type?: string; text?: string }) => item.type === 'text'
    )?.text

    if (!textBlock) {
      return NextResponse.json(
        { error: 'API yanıtı çözümlenemedi.' },
        { status: 500 }
      )
    }

    let parsed: { turkish?: string; english?: string } | null = null

    try {
      parsed = JSON.parse(textBlock)
    } catch {
      const cleaned = textBlock
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim()

      parsed = JSON.parse(cleaned)
    }

    const turkish = parsed?.turkish?.trim() || ''
    const english = parsed?.english?.trim() || ''

    if (!turkish || !english) {
      return NextResponse.json(
        { error: 'API eksik veri döndürdü.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      turkish,
      english,
    })
  } catch (error) {
    console.error('word-lookup route error:', error)
    return NextResponse.json(
      { error: 'Kelime arama sırasında beklenmeyen bir hata oluştu.' },
      { status: 500 }
    )
  }
}