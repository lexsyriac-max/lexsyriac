import { createClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// Fallback: grammar_rules_v2'de bulunamazsa basit prefix
function conjugateFallback(root: string, tense: string, person: string, number: string) {
  if (tense === 'past') {
    if (person === '1st' && number === 'singular') return root + 'ܬ'
    if (person === '1st' && number === 'plural') return root + 'ܢ'
    if (person === '2nd' && number === 'singular') return root + 'ܬ'
    if (person === '2nd' && number === 'plural') return root + 'ܬܘܢ'
    if (person === '3rd' && number === 'plural') return root + 'ܘ'
    return root
  }
  if (tense === 'present' || tense === 'imperfect') {
    if (person === '1st' && number === 'singular') return 'ܐ' + root
    if (person === '2nd' && number === 'singular') return 'ܬ' + root
    if (person === '3rd' && number === 'singular') return 'ܢ' + root
    return root
  }
  return root
}

// person formatı normalize et (1st→first, 2nd→second, 3rd→third)
function normPerson(p: string) {
  if (p === '1st' || p === 'first') return 'first'
  if (p === '2nd' || p === 'second') return 'second'
  if (p === '3rd' || p === 'third') return 'third'
  return p
}

// tense formatı normalize et
function normTense(t: string) {
  if (t === 'past') return 'perfect'
  if (t === 'present') return 'imperfect'
  return t
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
      gender = 'masculine',
    } = body

    if (!subject) {
      return NextResponse.json({ success: false, error: 'subject required' })
    }

    // Fiili çek
    let verbQuery = supabase.from('words').select('*')
    if (verb_id) verbQuery = verbQuery.eq('id', verb_id)
    else if (word_text) verbQuery = verbQuery.eq('syriac', word_text)
    else return NextResponse.json({ success: false, error: 'verb_id or word_text required' })

    const { data: verb, error: verbError } = await verbQuery.single()
    if (verbError || !verb) {
      return NextResponse.json({ success: false, error: 'Verb not found' })
    }

    const root = verb.root || verb.syriac
    const normalizedPerson = normPerson(person)
    const normalizedTense = normTense(tense)

    // 1. grammar_rules_v2'den çekimli formu ara
    const { data: rules } = await supabase
      .from('grammar_rules_v2')
      .select('example_output_syc, rule_text_en, source')
      .eq('category', 'VERB')
      .eq('example_input', root)
      .eq('is_active', true)
      .eq('tense', normalizedTense)
      .eq('person', normalizedPerson)
      .eq('number', number)
      .limit(1)

    let conjugatedVerb: string
    let conjugationSource: string

    if (rules && rules.length > 0 && rules[0].example_output_syc) {
      // grammar_rules_v2'den bulundu
      conjugatedVerb = rules[0].example_output_syc
      conjugationSource = `grammar_rules_v2 (${rules[0].source})`
    } else {
      // Fallback: basit prefix sistemi
      conjugatedVerb = conjugateFallback(root, tense, person, number)
      conjugationSource = 'fallback'
    }

    // Cümle kur
    let sentence = `${subject} ${conjugatedVerb}`
    if (object) sentence += ` ${object}`

    return NextResponse.json({
      success: true,
      sentence,
      parts: { subject, verb: conjugatedVerb, object: object || null },
      debug: {
        root_used: root,
        conjugation_source: conjugationSource,
        meta: { tense: normalizedTense, person: normalizedPerson, number, gender },
      },
    })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'error',
    })
  }
}
