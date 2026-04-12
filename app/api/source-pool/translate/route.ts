import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  try {
    const { document_id } = await req.json()

    if (!document_id) {
      return NextResponse.json({ success: false, error: 'document_id gerekli' })
    }

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
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY!,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5',
            max_tokens: 1024,
            messages: [{
              role: 'user',
              content: `Aşağıdaki metni Türkçe'ye çevir. Sadece çeviriyi yaz, açıklama ekleme:\n\n${chunk.content}`
            }]
          })
        })

        const data = await res.json()
        const translation = data.content?.[0]?.text || ''

        if (translation) {
          await supabase
            .from('source_text_chunks')
            .update({ translation_tr: translation })
            .eq('id', chunk.id)
          translated++
        }
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
