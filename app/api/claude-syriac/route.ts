import { NextRequest, NextResponse } from 'next/server'

type SyriacLookupResponse = {
  syriac: string
  transliteration: string
  root: string
  english: string
  source: 'sedra' | 'ai' | 'fallback'
  sedra_found: boolean
  sedra_verified: boolean
}

const EMPTY_RESULT = (english: string): SyriacLookupResponse => ({
  syriac: '',
  transliteration: '',
  root: '',
  english,
  source: 'fallback',
  sedra_found: false,
  sedra_verified: false,
})

const clean = (v: unknown) => String(v ?? '').trim()

function transliterate(syriac: string) {
  const map: Record<string, string> = {
    'ܐ': 'ʾ',
    'ܒ': 'b',
    'ܓ': 'g',
    'ܕ': 'd',
    'ܗ': 'h',
    'ܘ': 'w',
    'ܙ': 'z',
    'ܚ': 'ḥ',
    'ܛ': 'ṭ',
    'ܝ': 'y',
    'ܟ': 'k',
    'ܠ': 'l',
    'ܡ': 'm',
    'ܢ': 'n',
    'ܣ': 's',
    'ܥ': 'ʿ',
    'ܦ': 'p',
    'ܨ': 'ṣ',
    'ܩ': 'q',
    'ܪ': 'r',
    'ܫ': 'š',
    'ܬ': 't',
  }

  return syriac
    .split('')
    .map((char) => map[char] || '')
    .join('')
}

function normalizeResult(input: Partial<SyriacLookupResponse>, english: string): SyriacLookupResponse {
  return {
    syriac: clean(input.syriac),
    transliteration: clean(input.transliteration),
    root: clean(input.root),
    english: clean(input.english) || english,
    source:
      input.source === 'sedra' || input.source === 'ai' || input.source === 'fallback'
        ? input.source
        : 'fallback',
    sedra_found: Boolean(input.sedra_found),
    sedra_verified: Boolean(input.sedra_verified),
  }
}

async function lookupSedra(english: string): Promise<SyriacLookupResponse | null> {
  try {
    const res = await fetch(
      `https://sedra.bethmardutho.org/api/word/${encodeURIComponent(english)}.json`,
      { cache: 'no-store' }
    )

    if (!res.ok) return null

    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null

    const item = data[0]
    const syriac = clean(item?.syriac)

    if (!syriac) return null

    return normalizeResult(
      {
        syriac,
        transliteration: transliterate(syriac),
        root: '',
        english: clean(item?.glosses?.eng?.[0]) || english,
        source: 'sedra',
        sedra_found: true,
        sedra_verified: true,
      },
      english
    )
  } catch (error) {
    console.error('Sedra lookup error:', error)
    return null
  }
}

function extractJsonBlock(text: string) {
  const cleaned = text.replace(/```json|```/g, '').trim()
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null
  }

  return cleaned.slice(firstBrace, lastBrace + 1)
}

async function fromAnthropic(english: string): Promise<SyriacLookupResponse | null> {
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
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 180,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: `Return only valid JSON.

Schema:
{"syriac":"...","transliteration":"...","root":"..."}

Rules:
- Translate the English word into a single Syriac lexical form.
- Use academic dictionary style judgment.
- root should be short and plain if known.
- If root is unknown, return empty string.
- No explanation.
- No markdown.
- No extra text.

English word: ${english}`,
          },
        ],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Anthropic API error:', errText)
      return null
    }

    const data = await res.json()
    const rawText = String(data?.content?.[0]?.text || '').trim()

    if (!rawText) return null

    const jsonBlock = extractJsonBlock(rawText)
    if (!jsonBlock) return null

    const parsed = JSON.parse(jsonBlock)

    const result = normalizeResult(
      {
        syriac: parsed?.syriac,
        transliteration: parsed?.transliteration,
        root: parsed?.root,
        english,
        source: 'ai',
        sedra_found: false,
        sedra_verified: false,
      },
      english
    )

    if (!result.syriac) return null
    return result
  } catch (error) {
    console.error('Anthropic parse/request error:', error)
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const english = clean(body?.english)

    if (!english) {
      return NextResponse.json({ error: 'English gerekli' }, { status: 400 })
    }

    const sedra = await lookupSedra(english)
    if (sedra?.syriac) {
      return NextResponse.json(sedra)
    }

    const ai = await fromAnthropic(english)
    if (ai?.syriac) {
      return NextResponse.json(ai)
    }

    return NextResponse.json(EMPTY_RESULT(english))
  } catch (error) {
    console.error('claude-syriac route error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}