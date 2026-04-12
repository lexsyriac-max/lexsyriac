import { NextRequest, NextResponse } from 'next/server'

async function callRuleEngine(baseUrl: string, payload: any) {
  const res = await fetch(`${baseUrl}/api/grammar-rules/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return res.json()
}

// 🔥 FİİL NORMALIZE (çekim → kök)
function normalizeVerb(verb: string) {
  if (!verb) return verb

  if (verb.startsWith('ܐ')) return verb.slice(1)
  if (verb.startsWith('ܢ')) return verb.slice(1)
  if (verb.startsWith('ܬ')) return verb.slice(1)
  if (verb.startsWith('ܘ')) return verb.slice(1)

  return verb
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      sentence,
      tense = 'past',
      person = '1st',
      number = 'singular',
    } = body

    if (!sentence) {
      return NextResponse.json({
        success: false,
        error: 'sentence required',
      })
    }

    // 🔥 PARSE
    const words = sentence.trim().split(/\s+/)

    if (words.length < 2) {
      return NextResponse.json({
        success: false,
        error: 'invalid sentence',
      })
    }

    const subject = words[0]
    const verb = words[1]
    const object = words[2] || null

    const baseUrl = req.nextUrl.origin

    // 🔥 ROOT ÇIKAR
    const rootVerb = normalizeVerb(verb)

    // 🔥 RULE ENGINE ÇAĞIR
    const ruleResult = await callRuleEngine(baseUrl, {
      word_text: rootVerb,
      category: 'VERB',
      tense,
      person,
      number,
    })

    const rule = ruleResult?.results?.[0] || null

    return NextResponse.json({
      success: true,

      parsed: {
        subject,
        verb,
        object,
      },

      analysis: {
        root: rootVerb,
        tense,
        person,
        number,
      },

      rule,

      debug: {
        engine_response: ruleResult || null,
      },
    })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'error',
    })
  }
}