import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: verbs } = await sb
    .from('words')
    .select('id,turkish,syriac,english')
    .eq('word_type', 'verb')
    .not('syriac', 'is', null)
    .neq('syriac', '')

  if (!verbs?.length) return NextResponse.json({ message: 'Fiil bulunamadı' })

  let totalSaved = 0
  const results: string[] = []

  for (const verb of verbs) {
    try {
      const sedraRes = await fetch(
        `https://sedra.bethmardutho.org/api/word/${encodeURIComponent(verb.syriac)}.json`
      )
      const sedraData = sedraRes.ok ? await sedraRes.json() : []
      const sedraForms = (sedraData || []).filter((w: any) => w.tense)

      let saved = 0
      for (const f of sedraForms) {
        if (!f.syriac || !f.tense) continue
        const { error } = await sb.from('grammar_rules_v2').insert({
          name: `${verb.turkish} — ${f.tense} ${f.person || ''} ${f.number || ''} ${f.gender || ''}`.trim(),
          category: 'VERB',
          tense: f.tense,
          person: f.person || null,
          number: f.number || null,
          gender: f.gender || null,
          example_input: verb.syriac,
          example_output_syc: f.syriac,
          rule_text_en: f.western ? `Western: ${f.western}` : null,
          source: 'sedra',
          supported_languages: ['syc'],
          is_active: true,
          difficulty_level: 1,
          version: 1,
        })
        if (!error) saved++
      }

      if (sedraForms.length < 4) {
        const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY!,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5',
            max_tokens: 1000,
            messages: [{
              role: 'user',
              content: `Conjugate Classical Syriac verb "${verb.syriac}" (${verb.english || verb.turkish}).
Return ONLY valid JSON array:
[{"tense":"perfect|imperfect|active participle","person":"first|second|third","number":"singular|plural","gender":"masculine|feminine","syriac":"(Syriac script)","western":"(voweled)"}]
Generate: perfect 1st/2nd/3rd singular masculine, imperfect 1st/3rd singular`
            }]
          })
        })
        const cd = await claudeRes.json()
        const text = (cd?.content?.[0]?.text || '').replace(/\`\`\`json|\`\`\`/g, '').trim()
        try {
          const claudeForms = JSON.parse(text)
          for (const f of claudeForms) {
            if (!f.syriac || !/[\u0700-\u074F]/.test(f.syriac)) continue
            const { error } = await sb.from('grammar_rules_v2').insert({
              name: `${verb.turkish} — ${f.tense} ${f.person || ''} ${f.number || ''} ${f.gender || ''}`.trim(),
              category: 'VERB',
              tense: f.tense,
              person: f.person || null,
              number: f.number || null,
              gender: f.gender || null,
              example_input: verb.syriac,
              example_output_syc: f.syriac,
              rule_text_en: f.western ? `Western: ${f.western}` : null,
              source: 'claude',
              supported_languages: ['syc'],
              is_active: false,
              difficulty_level: 1,
              version: 1,
            })
            if (!error) saved++
          }
        } catch { /* skip */ }
      }

      totalSaved += saved
      results.push(`${verb.turkish}(${verb.syriac}): ${saved}`)
    } catch (e: any) {
      results.push(`ERR ${verb.turkish}: ${e.message}`)
    }
  }

  return NextResponse.json({ totalSaved, verbs: verbs.length, results })
}
