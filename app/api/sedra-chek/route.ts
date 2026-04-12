import { NextRequest, NextResponse } from 'next/server'

type InputType = 'english' | 'syriac'

const clean = (v: unknown) => String(v ?? '').trim()

const SYRIAC_TO_LATIN_MAP: Record<string, string> = {
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

function transliterateSyriac(syriac: string) {
  return syriac
    .split('')
    .map((char) => SYRIAC_TO_LATIN_MAP[char] || '')
    .join('')
    .trim()
}

async function lookupSedraByEnglish(english: string) {
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

    return {
      found: true,
      inputType: 'english' as const,
      source: 'sedra',
      sedra_verified: true,
      english: clean(item?.glosses?.eng?.[0]) || english,
      syriac,
      transliteration: transliterateSyriac(syriac),
      root: clean(item?.root) || '',
    }
  } catch (error) {
    console.error('Sedra english lookup error:', error)
    return null
  }
}

async function lookupSedraBySyriac(syriacInput: string) {
  try {
    const res = await fetch(
      `https://sedra.bethmardutho.org/api/word/${encodeURIComponent(syriacInput)}.json`,
      { cache: 'no-store' }
    )

    if (!res.ok) return null

    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null

    const item = data[0]
    const syriac = clean(item?.syriac) || syriacInput
    if (!syriac) return null

    return {
      found: true,
      inputType: 'syriac' as const,
      source: 'sedra',
      sedra_verified: true,
      english: clean(item?.glosses?.eng?.[0]) || '',
      syriac,
      transliteration: transliterateSyriac(syriac),
      root: clean(item?.root) || '',
    }
  } catch (error) {
    console.error('Sedra syriac lookup error:', error)
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = clean(body?.input)
    const inputType = clean(body?.inputType) as InputType

    if (!input || !inputType) {
      return NextResponse.json(
        { error: 'input ve inputType gerekli' },
        { status: 400 }
      )
    }

    if (inputType !== 'english' && inputType !== 'syriac') {
      return NextResponse.json(
        { error: 'Sedra kontrolü sadece english ve syriac için yapılır' },
        { status: 400 }
      )
    }

    const result =
      inputType === 'english'
        ? await lookupSedraByEnglish(input)
        : await lookupSedraBySyriac(input)

    if (result) {
      return NextResponse.json(result)
    }

    return NextResponse.json({
      found: false,
      inputType,
      source: 'sedra',
      sedra_verified: false,
      english: '',
      syriac: inputType === 'syriac' ? input : '',
      transliteration:
        inputType === 'syriac' ? transliterateSyriac(input) : '',
      root: '',
    })
  } catch (error) {
    console.error('sedra-check route error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}