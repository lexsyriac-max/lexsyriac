import { createClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

function conjugate(root: string, tense: string) {
  if (tense !== 'past') return {}

  return {
    '1st_singular': 'ܐ' + root,
    '1st_plural': 'ܢ' + root,

    '2nd_singular': 'ܬ' + root,
    '2nd_plural': 'ܬܘܢ' + root,

    '3rd_singular': root,
    '3rd_plural': 'ܘ' + root,
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await req.json()
    const { word_id, word_text, tense = 'past' } = body

    let query = supabase.from('words').select('*')

    if (word_id) {
      query = query.eq('id', word_id)
    } else if (word_text) {
      query = query.eq('syriac', word_text)
    } else {
      return NextResponse.json({
        success: false,
        error: 'word_id or word_text required',
      })
    }

    const { data: word } = await query.single()

    if (!word) {
      return NextResponse.json({
        success: false,
        error: 'Word not found',
      })
    }

    const root = word.root || word.syriac

    const table = conjugate(root, tense)

    return NextResponse.json({
      success: true,
      word: {
        syriac: word.syriac,
        root,
      },
      conjugation: table,
    })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'error',
    })
  }
}