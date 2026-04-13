import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

function tokenize(text: string): string[] {
  return text
    .split(/[\s\u200c\u200d\u060c,\.،؟?!:;\(\)\[\]{}\"']+/)
    .map(t => t.trim())
    .filter(t => t.length > 0)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  try {
    const { document_id } = await req.json()

    if (!document_id) {
      return NextResponse.json({ success: false, error: 'document_id gerekli' })
    }

    const { data: chunks, error: chunkError } = await supabase
      .from('source_text_chunks')
      .select('id, content')
      .eq('document_id', document_id)

    if (chunkError) return NextResponse.json({ success: false, error: chunkError.message })

    const { data: words, error: wordError } = await supabase
      .from('words')
      .select('id, turkish, syriac')

    if (wordError) return NextResponse.json({ success: false, error: wordError.message })

    if (!chunks || !words) {
      return NextResponse.json({ success: false, error: 'Veri bulunamadı' })
    }

    // Süryanice ve Türkçe lookup map'leri
    const syriacMap = new Map<string, string>()
    const turkishMap = new Map<string, string>()

    for (const word of words) {
      if (word.syriac) syriacMap.set(word.syriac.trim(), word.id)
      if (word.turkish) turkishMap.set(word.turkish.trim().toLowerCase(), word.id)
    }

    const matches: {
      word_id: string
      chunk_id: string
      document_id: string
      match_text: string
    }[] = []

    const seenPairs = new Set<string>()

    for (const chunk of chunks) {
      const tokens = tokenize(chunk.content)

      for (const token of tokens) {
        // Önce Süryanice eşleştir (tam eşleşme)
        const syriacWordId = syriacMap.get(token)
        if (syriacWordId) {
          const pairKey = `${syriacWordId}-${chunk.id}`
          if (!seenPairs.has(pairKey)) {
            seenPairs.add(pairKey)
            matches.push({
              word_id: syriacWordId,
              chunk_id: chunk.id,
              document_id,
              match_text: token,
            })
          }
          continue
        }

        // Sonra Türkçe eşleştir (küçük harf)
        const turkishWordId = turkishMap.get(token.toLowerCase())
        if (turkishWordId) {
          const pairKey = `${turkishWordId}-${chunk.id}`
          if (!seenPairs.has(pairKey)) {
            seenPairs.add(pairKey)
            matches.push({
              word_id: turkishWordId,
              chunk_id: chunk.id,
              document_id,
              match_text: token,
            })
          }
        }
      }
    }

    if (matches.length === 0) {
      return NextResponse.json({ success: true, matched: 0 })
    }

    await supabase
      .from('source_word_index')
      .delete()
      .eq('document_id', document_id)

    const { error: insertError } = await supabase
      .from('source_word_index')
      .insert(matches)

    if (insertError) return NextResponse.json({ success: false, error: insertError.message })

    await supabase
      .from('source_documents')
      .update({ status: 'done' })
      .eq('id', document_id)

    const matchedWords = [...new Set(matches.map(m => m.match_text))]
    return NextResponse.json({ success: true, matched: matches.length, words: matchedWords })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'error',
    })
  }
}
