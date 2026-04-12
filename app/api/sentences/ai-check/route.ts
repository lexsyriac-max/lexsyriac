import { createClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

async function callRuleEngine(baseUrl: string, payload: any) {
  try {
    const res = await fetch(`${baseUrl}/api/grammar-rules/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      throw new Error('Rule engine failed')
    }

    return await res.json()
  } catch (err) {
    return null
  }
}

function normalizeVerb(verb: string) {
  if (verb.startsWith('ܐ')) return { root: verb.slice(1), prefix: 'ܐ' }
  if (verb.startsWith('ܢ')) return { root: verb.slice(1), prefix: 'ܢ' }
  if (verb.startsWith('ܬ')) return { root: verb.slice(1), prefix: 'ܬ' }
  if (verb.startsWith('ܘ')) return { root: verb.slice(1), prefix: 'ܘ' }

  return { root: verb, prefix: '' }
}

function explainError(meta: any, expected: string) {
  const { person, number, tense } = meta

  if (tense === 'past') {
    if (person === '1st' && number === 'singular') {
      return `❌ Hata: 1. tekil geçmiş zaman fiilleri "ܐ" prefix'i alır.\n✔ Doğru: ${expected}`
    }

    if (person === '1st' && number === 'plural') {
      return `❌ Hata: 1. çoğul geçmiş zaman fiilleri "ܢ" prefix'i alır.\n✔ Doğru: ${expected}`
    }

    if (person === '2nd') {
      return `❌ Hata: 2. şahıs fiilleri "ܬ" ile başlar.\n✔ Doğru: ${expected}`
    }

    if (person === '3rd' && number === 'plural') {
      return `❌ Hata: 3. çoğul fiiller "ܘ" prefix'i alır.\n✔ Doğru: ${expected}`
    }
  }

  return `❌ Hatalı kullanım.\n✔ Doğru: ${expected}`
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await req.json()

    const {
      sentence,
      tense = 'past',
      person = '1st',
      number = 'singular',
    } = body

    if (!sentence) {
      return NextResponse.json({ success: false, error: 'sentence required' })
    }

    const words = sentence.trim().split(/\s+/)

    if (words.length < 2) {
      return NextResponse.json({ success: false, error: 'invalid sentence' })
    }

    const subject = words[0]
    const verb = words[1]
    const object = words[2] || null

    const { root, prefix } = normalizeVerb(verb)

    const baseUrl = req.nextUrl.origin

    const ruleResult = await callRuleEngine(baseUrl, {
      word_text: root,
      category: 'VERB',
      tense,
      person,
      number,
    })

    const expected =
      ruleResult?.results?.[0]?.output?.trim() || root

    const actual = verb.trim()
    const isCorrect = actual === expected

    let explanation = null

    if (!isCorrect) {
      explanation = explainError(
        { person, number, tense },
        expected
      )

      // 🔥 SADECE HATALARI KAYDET
      await supabase.from('sentence_errors').insert({
        sentence,
        subject,
        verb: actual,
        root,
        expected,
        actual,
        is_correct: false,
        person,
        number,
        tense,
        explanation,
      })
    }

    return NextResponse.json({
      success: true,
      input: {
        sentence,
        subject,
        verb: actual,
        object,
      },
      analysis: {
        root,
        prefix,
        expected,
        actual,
        isCorrect,
      },
      feedback: isCorrect
        ? '✅ Doğru kullanım'
        : `❌ Hatalı fiil. Doğrusu: ${expected}`,
      explanation,
      meta: { person, number, tense },
    })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'error',
    })
  }
}