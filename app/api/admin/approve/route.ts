import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function norm(v: string) {
  return (v || '').trim().toLowerCase()
}

function normalizeWordType(value: string) {
  const v = (value || '').trim().toLowerCase()
  if (['isim', 'noun', 'ad'].includes(v)) return 'noun'
  if (['fiil', 'verb'].includes(v)) return 'verb'
  if (['sifat', 'sıfat', 'adjective'].includes(v)) return 'adjective'
  if (['zarf', 'adverb'].includes(v)) return 'adjective'
  if (['zamir', 'pronoun'].includes(v)) return 'pronoun'
  if (['edat', 'preposition'].includes(v)) return 'other'
  if (['baglac', 'bağlaç', 'conjunction'].includes(v)) return 'other'
  if (['unlem', 'ünlem', 'interjection'].includes(v)) return 'other'
  return 'noun'
}

function normalizeGrammarLanguage(lang?: string) {
  const v = (lang || '').trim().toLowerCase()
  if (['tr', 'turkish', 'türkçe'].includes(v)) return 'tr'
  if (['en', 'english', 'ingilizce'].includes(v)) return 'en'
  if (['syc', 'syriac', 'süryanice', 'arc', 'aramaic', 'aramice'].includes(v)) return 'syc'
  if (['de', 'german', 'almanca'].includes(v)) return 'de'
  if (['fr', 'french', 'fransızca'].includes(v)) return 'fr'
  return 'tr'
}

type SyriacAiResult = {
  sentence_syc: string
  confidence: 'high' | 'medium' | 'low'
  notes?: string
}

async function generateSyriacWithClaude(params: {
  text: string
  sourceLanguage: 'tr' | 'en'
}): Promise<SyriacAiResult | null> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) { console.error('ANTHROPIC_API_KEY tanımlı değil'); return null }

    const prompt = `
You are a Syriac translation engine.

Task:
Translate the given sentence into Classical Syriac.

Rules:
- Return ONLY valid JSON.
- Do not add markdown.
- Do not explain outside JSON.
- Keep the output concise and natural.
- Preserve meaning, not word-for-word awkwardness.
- Use Syriac script for sentence_syc.
- confidence must be one of: high, medium, low.

JSON format:
{
  "sentence_syc": "...",
  "confidence": "high|medium|low",
  "notes": "short note"
}

Source language: ${params.sourceLanguage}
Source sentence: ${params.text}
`.trim()

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await anthropicRes.json()
    if (!anthropicRes.ok) { console.error('CLAUDE API ERROR:', data); return null }

    const text = Array.isArray(data?.content)
      ? data.content
          .filter((item: { type?: string; text?: string }) => item?.type === 'text')
          .map((item: { text?: string }) => item?.text || '')
          .join('\n').trim()
      : ''

    if (!text) return null

    let parsed: SyriacAiResult | null = null
    try {
      parsed = JSON.parse(text)
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        try { parsed = JSON.parse(match[0]) } catch { parsed = null }
      }
    }

    if (!parsed?.sentence_syc || typeof parsed.sentence_syc !== 'string') return null

    return {
      sentence_syc: parsed.sentence_syc.trim(),
      confidence: ['high','medium','low'].includes(parsed.confidence) ? parsed.confidence : 'low',
      notes: parsed.notes?.trim() || '',
    }
  } catch (error) {
    console.error('generateSyriacWithClaude ERROR:', error)
    return null
  }
}

async function approveWord(sb: ReturnType<typeof getAdminClient>, w: any) {
  const turkish = norm(w.word_tr || w.lemma || '')
  const syriac = (w.word_syc || '').trim()
  if (!turkish && !syriac) return 'error'
  const filters: string[] = []
  if (turkish) filters.push(`turkish.eq.${turkish}`)
  if (syriac) filters.push(`syriac.eq.${syriac}`)
  const { data: exist } = await sb.from('words').select('id').or(filters.join(',')).limit(1)
  if (exist && exist.length > 0) return 'duplicate'
  const { error: insE } = await sb.from('words').insert({
    turkish: turkish || '', syriac: syriac || '', english: w.word_en || '',
    transliteration: w.transliteration || '', word_type: normalizeWordType(w.pos || 'isim'),
  })
  if (insE) { console.error('WORD INSERT ERROR:', insE); return 'error' }
  await sb.from('pending_words').delete().eq('id', w.id)
  return 'ok'
}

async function approveGrammar(sb: ReturnType<typeof getAdminClient>, g: any) {
  const name = (g.rule_name || '').trim()
  if (!name) return 'error'
  let categoryId = g.category_id
  if (!categoryId) {
    const { data: cat } = await sb.from('categories').select('id').eq('name', 'general').eq('type', 'grammar').single()
    if (!cat?.id) return 'error'
    categoryId = cat.id
  }
  const { data: exist } = await sb.from('grammar_rules').select('id').eq('rule_title', name).limit(1)
  if (exist && exist.length > 0) return 'duplicate'
  const { error: insE } = await sb.from('grammar_rules').insert({
    rule_title: name, rule_description: g.description || '',
    language: normalizeGrammarLanguage(g.language), category_id: categoryId, is_approved: true,
  })
  if (insE) { console.error('GRAMMAR INSERT ERROR:', insE); return 'error' }
  await sb.from('pending_grammar').delete().eq('id', g.id)
  return 'ok'
}

async function approveSentence(sb: ReturnType<typeof getAdminClient>, s: any) {
  let syc = (s.sentence_syc || '').trim()
  const tr = (s.sentence_tr || '').trim()
  const en = (s.sentence_en || '').trim()
  if (!syc && !tr && !en) return 'error'

  let aiGenerated = false
  let aiNotes = ''
  let aiConfidence: 'high' | 'medium' | 'low' | null = null

  if (!syc) {
    const sourceText = tr || en
    const sourceLanguage: 'tr' | 'en' = tr ? 'tr' : 'en'
    if (sourceText) {
      const aiResult = await generateSyriacWithClaude({ text: sourceText, sourceLanguage })
      if (aiResult?.sentence_syc) {
        syc = aiResult.sentence_syc
        aiGenerated = true
        aiNotes = aiResult.notes || ''
        aiConfidence = aiResult.confidence
      }
    }
  }

  const filters: string[] = []
  if (syc) filters.push(`sentence_syc.eq.${syc}`)
  if (tr) filters.push(`sentence_tr.eq.${tr}`)
  if (filters.length > 0) {
    const { data: exist } = await sb.from('sentences').select('id').or(filters.join(',')).limit(1)
    if (exist && exist.length > 0) return 'duplicate'
  }

  let categoryId = s.category_id
  if (!categoryId) {
    const { data: cat } = await sb.from('categories').select('id').eq('name', 'basic').eq('type', 'sentence').single()
    if (!cat?.id) return 'error'
    categoryId = cat.id
  }

  const noteParts = [s.notes || '']
  if (aiGenerated) {
    noteParts.push(
      `AI Syriac generated from ${tr ? 'TR' : 'EN'} source`,
      aiConfidence ? `AI confidence: ${aiConfidence}` : '',
      aiNotes || ''
    )
  }

  const { error: insE } = await sb.from('sentences').insert({
    sentence_text: syc || tr || en || '',
    sentence_syc: syc || null,
    sentence_tr: tr || null,
    sentence_en: en || null,
    language: syc ? 'syc' : s.base_language || 'syc',
    base_language: s.base_language || (tr ? 'tr' : en ? 'en' : 'syc'),
    source: s.source || 'lexscan',
    category_id: categoryId,
    notes: noteParts.filter(Boolean).join(' | '),
    needs_review: s.needs_review || aiGenerated || aiConfidence === 'low',
    approved_at: new Date().toISOString(),
  })

  if (insE) { console.error('SENTENCE INSERT ERROR:', insE); return 'error' }
  await sb.from('pending_sentences').delete().eq('id', s.id)
  return 'ok'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, item } = body
    if (!type || !item) return NextResponse.json({ error: 'type ve item gerekli' }, { status: 400 })
    const sb = getAdminClient()
    let result: string
    if (type === 'word') result = await approveWord(sb, item)
    else if (type === 'grammar') result = await approveGrammar(sb, item)
    else if (type === 'sentence') result = await approveSentence(sb, item)
    else return NextResponse.json({ error: 'Geçersiz type' }, { status: 400 })
    return NextResponse.json({ result })
  } catch (err: any) {
    console.error('APPROVE ROUTE ERROR:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
