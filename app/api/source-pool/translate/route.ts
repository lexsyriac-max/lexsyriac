import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  try {
    const { document_id } = await req.json()

    if (!document_id) {
      return NextResponse.json({ success: false, error: 'document_id gerekli' })
    }

    // Chunk'ları getir
    const { data: chunks, error } = await supabase
      .from('source_text_chunks')
      .select('id, content')
      .eq('document_id', document_id)

    if (error || !chunks) {
      return NextResponse.json({ success: false, error: 'Chunk bulunamadı' })
    }

    let translated = 0

    for (const chunk of chunks) {
      if (!chunk.content?.trim()) continue

      try {
        const message = await anthropic.messages.create({
          model: 'claude-opus-4-5',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: `Aşağıdaki metni Türkçe'ye çevir. Sadece çeviriyi yaz, açıklama ekleme:\n\n${chunk.content}`
          }]
        })

        const translation = message.content[0].type === 'text' ? message.content[0].text : ''

        await supabase
          .from('source_text_chunks')
          .update({ translation_tr: translation })
          .eq('id', chunk.id)

        translated++
      } catch {
        continue
      }
    }

    return NextResponse.json({ success: true, translated })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Tercüme hatası',
    })
  }
}
