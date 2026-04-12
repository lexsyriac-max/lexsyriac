import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

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

    const matches: {
      word_id: string
      chunk_id: string
      document_id: string
      match_text: string
    }[] = []

    for (const chunk of chunks) {
      const contentLower = chunk.content.toLowerCase()

      for (const word of words) {
        const targets = [word.turkish, word.syriac].filter(Boolean)

        for (const target of targets) {
          if (target && contentLower.includes(target.toLowerCase())) {
            matches.push({
              word_id: word.id,
              chunk_id: chunk.id,
              document_id,
              match_text: target,
            })
            break
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

    return NextResponse.json({ success: true, matched: matches.length })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'error',
    })
  }
}
