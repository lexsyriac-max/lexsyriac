import { NextRequest, NextResponse } from 'next/server'
import {
  normalizeSyriacForLookup,
  transliterateSyriac,
} from '@/lib/syriac/script-engine'

type ResolveInputType = 'turkish' | 'english' | 'syriac'

type ClaudeResolvedWord = {
  turkish: string
  english: string
  syriac: string
  transliteration: string
  root: string
  word_type: string
  source: 'ai' | 'sedra'
  is_verified: boolean
  sedra_verified: boolean
}

function clean(value: unknown) {
  return String(value ?? '').trim()
}

function cleanSedraGloss(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''

  const noHtml = raw.replace(/<[^>]*>/g, ' ')
  const normalized = noHtml.replace(/\s+/g, ' ').trim()

  const withoutLeadingGrammar = normalized
    .replace(/^[0-9]+\s+[a-z]+\.\s*/i, '')
    .replace(/^[0-9]+\s*[a-z]+\.\s*/i, '')
    .replace(/^[ivx]+\s*/i, '')
    .trim()

  const splitByIa = withoutLeadingGrammar.split(/\bIa\b/i)
  const afterIa =
    splitByIa.length > 1 ? splitByIa.slice(1).join(' Ia ').trim() : withoutLeadingGrammar

  const splitByComma = afterIa.split(',')
  if (splitByComma.length > 1) {
    const tail = splitByComma.slice(1).join(',').trim()
    return tail || afterIa
  }

  return afterIa
}

function buildPrompt(input: string, inputType: ResolveInputType) {
  const languageMap: Record<ResolveInputType, string> = {
    turkish: 'Türkçe',
    english: 'İngilizce',
    syriac: 'Süryanice',
  }

  return `
Sen Süryanice–Türkçe–İngilizce üçdilli sözlük motorusun.

Kullanıcı sana ${languageMap[inputType]} dilinde TEK BİR SÖZCÜK verdi:
"${input}"

Görevin:
1. Bu sözcüğün en uygun Türkçe karşılığını ver.
2. En uygun İngilizce karşılığını ver.
3. En uygun Klasik Süryanice yazımını ver.
4. Süryanice sözcüğün Latin transliterasyonunu ver.
5. Mümkünse kökü (root) ver.
6. Mümkünse kelime türünü ver.

Kurallar:
- Yalnızca TEK bir ana karşılık ver.
- Açıklama yazma.
- Markdown kullanma.
- JSON dışında hiçbir şey yazma.
- Süryanice alanında yalnızca Süryanice yazı kullan.
- transliteration alanında yalnızca Latin transliterasyon ver.
- root alanında bilmiyorsan boş string ver.
- word_type için şu değerlerden birini seç:
  isim, fiil, sıfat, zarf, zamir, edat, bağlaç, ünlem, soru, birleşik, deyim, diğer

Yanıtı tam olarak şu JSON şemasında ver:
{
  "turkish": "",
  "english": "",
  "syriac": "",
  "transliteration": "",
  "root": "",
  "word_type": ""
}
`.trim()
}

async function askClaude(input: string, inputType: ResolveInputType): Promise<ClaudeResolvedWord> {
  const apiKey =
    process.env.ANTHROPIC_API_KEY ||
    process.env.CLAUDE_API_KEY ||
    process.env.CLAUDE_API_SECRET ||
    ''

  if (!apiKey) {
    throw new Error('Anthropic API anahtarı bulunamadı.')
  }

  const model =
    process.env.CLAUDE_WORD_MODEL ||
    process.env.ANTHROPIC_MODEL ||
    'claude-sonnet-4-5-20250929'

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 400,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: buildPrompt(input, inputType),
        },
      ],
    }),
    cache: 'no-store',
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data?.error?.message || 'Claude isteği başarısız oldu.')
  }

  const rawText = clean(data?.content?.[0]?.text).replace(/```json|```/g, '').trim()
  const jsonMatch = rawText.match(/\{[\s\S]*\}/)

  if (!jsonMatch) {
    throw new Error('Claude geçerli JSON döndürmedi.')
  }

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    throw new Error('Claude JSON parse edilemedi.')
  }

  const syriac = clean(parsed.syriac)
  const transliteration =
    clean(parsed.transliteration) || (syriac ? transliterateSyriac(syriac) : '')

  return {
    turkish: clean(parsed.turkish),
    english: clean(parsed.english),
    syriac,
    transliteration,
    root: clean(parsed.root),
    word_type: clean(parsed.word_type) || 'diğer',
    source: 'ai',
    is_verified: false,
    sedra_verified: false,
  }
}

async function trySedraBySyriac(syriacWord: string) {
  const normalized = normalizeSyriacForLookup(syriacWord)
  if (!normalized) return null

  try {
    const res = await fetch(
      `https://sedra.bethmardutho.org/api/word/${encodeURIComponent(normalized)}.json`,
      { cache: 'no-store' }
    )

    if (!res.ok) return null

    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null

    const item = data[0]
    const glosses = Array.isArray(item?.glosses?.eng) ? item.glosses.eng : []
    const root = clean(item?.root)

    return {
      found: true,
      normalized,
      englishGloss: cleanSedraGloss(glosses[0]),
      root,
    }
  } catch {
    return null
  }
}

function mergeSedra(
  ai: ClaudeResolvedWord,
  sedraResult: Awaited<ReturnType<typeof trySedraBySyriac>>
) {
  if (!sedraResult?.found) {
    return {
      ...ai,
      sedra_checked: true,
      sedra_found: false,
      checked_field: 'syriac',
    }
  }

  return {
    ...ai,
    english: sedraResult.englishGloss || ai.english,
    root: sedraResult.root || ai.root,
    source: 'sedra' as const,
    is_verified: true,
    sedra_verified: true,
    sedra_checked: true,
    sedra_found: true,
    checked_field: 'syriac' as const,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = clean(body?.input)
    const inputType = clean(body?.inputType) as ResolveInputType

    if (!input) {
      return NextResponse.json({ error: 'input gerekli' }, { status: 400 })
    }

    if (!['turkish', 'english', 'syriac'].includes(inputType)) {
      return NextResponse.json({ error: 'geçersiz inputType' }, { status: 400 })
    }

    const aiResult = await askClaude(input, inputType)

    if (aiResult.syriac) {
      const sedraResult = await trySedraBySyriac(aiResult.syriac)
      const merged = mergeSedra(aiResult, sedraResult)
      return NextResponse.json(merged)
    }

    return NextResponse.json({
      ...aiResult,
      sedra_checked: false,
      sedra_found: false,
      checked_field: null,
    })
  } catch (error) {
    console.error('word-resolve error:', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Beklenmeyen hata',
      },
      { status: 500 }
    )
  }
}