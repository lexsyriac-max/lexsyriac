import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Geçerli Süryanice mi kontrol et
function isValidSyriac(s: string | null | undefined): boolean {
  if (!s || s.trim().length < 2) return false
  const syriacCount = (s.match(/[\u0700-\u074F]/g) || []).length
  return syriacCount >= 2
}

export async function POST() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const apiKey = process.env.ANTHROPIC_API_KEY!

  // Tüm kelimeleri çek
  const { data: allWords, error } = await sb
    .from('words')
    .select('id,turkish,english,syriac,word_type')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!allWords) return NextResponse.json({ updated: 0 })

  // Geçersiz Süryanicesi olanları filtrele
  const words = allWords.filter(w => !isValidSyriac(w.syriac))

  if (words.length === 0) {
    return NextResponse.json({ updated: 0, message: 'Tüm kelimelerin Süryanicesi geçerli' })
  }

  let updated = 0
  const batchSize = 20

  for (let i = 0; i < words.length; i += batchSize) {
    const batch = words.slice(i, i + batchSize)

    // EN öncelikli, yoksa TR kaynak
    const items = batch.map(w => ({
      id: w.id,
      source: (w.english?.trim() || w.turkish?.trim() || ''),
      source_lang: w.english?.trim() ? 'English' : 'Turkish',
      turkish: w.turkish || '',
      english: w.english || '',
      type: w.word_type,
    }))

    const prompt = `You are a Classical Syriac dictionary engine.
For each word below, provide the Classical Syriac script and transliteration.
Use the source word (English preferred, Turkish as fallback) to generate the Syriac.
Return ONLY valid JSON array, no explanation:
[{"id":"...","syriac":"(Syriac Unicode script)","transliteration":"(Latin romanization)","english":"(English meaning)"}]

Words:
${JSON.stringify(items.map(i => ({ id: i.id, source: i.source, source_lang: i.source_lang, turkish: i.turkish })))}`

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }]
        })
      })

      const data = await res.json()
      const text = (data?.content?.[0]?.text || '').replace(/```json|```/g, '').trim()
      const results = JSON.parse(text)

      for (const result of results) {
        if (result.id && isValidSyriac(result.syriac)) {
          const updateData: Record<string, string> = {
            syriac: result.syriac,
            transliteration: result.transliteration || '',
          }
          // İngilizce yoksa Claude'un ürettiğini de ekle
          const word = batch.find(w => w.id === result.id)
          if (word && !word.english?.trim() && result.english) {
            updateData.english = result.english
          }
          await sb.from('words').update(updateData).eq('id', result.id)
          updated++
        }
      }
    } catch { /* devam et */ }
  }

  return NextResponse.json({
    updated,
    total: words.length,
    message: `${updated}/${words.length} kelime tamamlandı`
  })
}
