import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/* ---------------- CLEAN ---------------- */
const clean = (v: any) => String(v || '').trim()
const cleanSyr = (v: any) =>
  String(v || '').replace(/[^\u0700-\u074F]/g, '').trim()

/* ---------------- SUPABASE ---------------- */
async function getSupabase() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )
}

/* ---------------- DB LOOKUP ---------------- */
async function lookupDB(supabase: any, p: any) {
  const q = supabase.from('words').select('*').limit(1)

  // 1. SÜRYANİCE ARAMA (Kök ve Çekimli Form Kontrolü)
  if (p.syriac) {
    const { data } = await q.eq('syriac', p.syriac).maybeSingle()
    if (data) return data

    // Ana kelimede yoksa word_forms tablosunda çekimli halini ara
    const { data: form } = await supabase
      .from('word_forms')
      .select('word_id')
      .eq('form_text', p.syriac)
      .maybeSingle()
      
    if (form) {
      const { data: rootWord } = await supabase
        .from('words')
        .select('*')
        .eq('id', form.word_id)
        .maybeSingle()
      if (rootWord) return rootWord
    }
  }

  // 2. TRANSLİTERASYON ARAMA
  if (p.transliteration) {
    const { data } = await q.ilike('transliteration', p.transliteration).maybeSingle()
    if (data) return data
  }

  // 3. İNGİLİZCE ARAMA
  if (p.english) {
    const { data } = await q.ilike('english', p.english).maybeSingle()
    if (data) return data
  }

  // 4. TÜRKÇE ARAMA
  if (p.turkish) {
    const { data } = await q.ilike('turkish', p.turkish).maybeSingle()
    if (data) return data
  }

  return null
}

/* ---------------- CLAUDE ---------------- */
async function askClaude(prompt: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 200,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) return null

    const data = await res.json()
    const text = data?.content?.[0]?.text || ''

    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    return null
  }
}

/* ---------------- SEDRA ---------------- */
async function fromSedra(syriac: string) {
  try {
    const res = await fetch(
      `https://sedra.bethmardutho.org/api/word/${encodeURIComponent(syriac)}.json`
    )

    if (!res.ok) return null

    const data = await res.json()
    const item = data?.[0]

    if (!item) return null

    return {
      syriac: item.syriac,
      english: item.glosses?.eng?.[0] || '',
      transliteration: item.stem || item.syriac,
      sedra: true,
      sedra_url: item.lexeme?.id
        ? `https://sedra.bethmardutho.org/lexeme/get/${item.lexeme.id}`
        : null,
    }
  } catch {
    return null
  }
}

/* ---------------- MAIN ---------------- */
export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabase()
    const body = await req.json()

    const payload = {
      english: clean(body.english),
      turkish: clean(body.turkish),
      syriac: cleanSyr(body.syriac),
      transliteration: clean(body.transliteration),
    }

    /* ================= 1. DB (Word & Word Forms) ================= */
    const db = await lookupDB(supabase, payload)
    if (db) {
      return NextResponse.json({
        ...db,
        source: 'database',
        verified: true,
      })
    }

    /* ================= 2. TÜRKÇE GİRİŞ (Tek Claude Çağrısı) ================= */
    if (payload.turkish) {
      const ai = await askClaude(
        `Translate the Turkish word "${payload.turkish}" to English, and Classical Syriac (with transliteration). Return strictly JSON format: {"english":"...","syriac":"...","transliteration":"..."}`
      )

      return NextResponse.json({
        turkish: payload.turkish,
        english: ai?.english || '',
        syriac: ai?.syriac || '',
        transliteration: ai?.transliteration || '',
        source: 'ai',
      })
    }

    /* ================= 3. İNGİLİZCE GİRİŞ (Tek Claude Çağrısı) ================= */
    if (payload.english) {
      const ai = await askClaude(
        `Translate the English word "${payload.english}" to Turkish, and Classical Syriac (with transliteration). Return strictly JSON format: {"turkish":"...","syriac":"...","transliteration":"..."}`
      )

      return NextResponse.json({
        english: payload.english,
        turkish: ai?.turkish || '',
        syriac: ai?.syriac || '',
        transliteration: ai?.transliteration || '',
        source: 'ai',
      })
    }

    /* ================= 4. SÜRYANİCE GİRİŞ ================= */
    if (payload.syriac) {
      const sedra = await fromSedra(payload.syriac)

      if (sedra) {
        // Sedra sadece İngilizce döndüğü için Türkçesini Claude'dan alıyoruz
        const tr = await askClaude(
          `Return JSON: {"turkish":"..."} English: ${sedra.english}`
        )

        return NextResponse.json({
          ...sedra,
          turkish: tr?.turkish || '',
          source: 'sedra',
        })
      }

      const ai = await askClaude(`
Translate this Classical Syriac word to English and Turkish. Return strictly JSON:
{"english":"...","turkish":"...","transliteration":"..."}
Syriac: ${payload.syriac}
`)

      return NextResponse.json({
        syriac: payload.syriac,
        ...ai,
        source: 'ai',
      })
    }

    return NextResponse.json({ error: 'Geçersiz giriş' }, { status: 400 })

  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}