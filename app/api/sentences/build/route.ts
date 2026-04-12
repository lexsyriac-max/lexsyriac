import { createClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

/**
 * 🔥 ROOT ENGINE (TEK KAYNAK)
 */
function conjugate(root: string, meta: any) {
  const { tense, person, number = 'singular' } = meta

  if (tense === 'past') {
    if (person === '1st' && number === 'singular') return 'ܐ' + root
    if (person === '1st' && number === 'plural') return 'ܢ' + root

    if (person === '2nd' && number === 'singular') return 'ܬ' + root
    if (person === '2nd' && number === 'plural') return 'ܬܘܢ' + root

    if (person === '3rd' && number === 'plural') return 'ܘ' + root

    return root
  }

  return root
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await req.json()

    const {
      subject,
      verb_id,
      word_text,
      object,
      tense = 'past',
      person = '1st',
      number = 'singular',
    } = body

    if (!subject) {
      return NextResponse.json({
        success: false,
        error: 'subject required',
      })
    }

    /**
     * 🔎 VERB ÇEK
     */
    let verbQuery = supabase.from('words').select('*')

    if (verb_id) {
      verbQuery = verbQuery.eq('id', verb_id)
    } else if (word_text) {
      verbQuery = verbQuery.eq('syriac', word_text)
    } else {
      return NextResponse.json({
        success: false,
        error: 'verb_id or word_text required',
      })
    }

    const { data: verb, error: verbError } = await verbQuery.single()

    if (verbError || !verb) {
      return NextResponse.json({
        success: false,
        error: 'Verb not found',
      })
    }

    /**
     * 🔥 ROOT AL (ÖNCELİK)
     */
    const root = verb.root || verb.syriac

    /**
     * 🔥 CONJUGATION (ARTIK TEK MOTOR)
     */
    const conjugatedVerb = conjugate(root, {
      tense,
      person,
      number,
    })

    /**
     * 🧱 SENTENCE
     */
    let sentence = `${subject} ${conjugatedVerb}`

    if (object) {
      sentence += ` ${object}`
    }

    return NextResponse.json({
      success: true,
      sentence,
      parts: {
        subject,
        verb: conjugatedVerb,
        object: object || null,
      },
      debug: {
        root_used: root,
        meta: { tense, person, number },
      },
    })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'error',
    })
  }
}