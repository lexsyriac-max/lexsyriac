export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  try {
    const { document_id } = await req.json()

    if (!document_id) {
      return NextResponse.json({ success: false, error: 'document_id gerekli' })
    }

    // Dökümanı getir
    const { data: doc, error: docError } = await supabase
      .from('source_documents')
      .select('*')
      .eq('id', document_id)
      .single()

    if (docError || !doc) {
      return NextResponse.json({ success: false, error: 'Döküman bulunamadı' })
    }

    // Status: processing
    await supabase
      .from('source_documents')
      .update({ status: 'processing' })
      .eq('id', document_id)

    // Storage'dan dosyayı indir
    const { data: fileData, error: storageError } = await supabase.storage
      .from('source-documents')
      .download(doc.storage_path)

    if (storageError || !fileData) {
      await supabase.from('source_documents').update({ status: 'error' }).eq('id', document_id)
      return NextResponse.json({ success: false, error: 'Dosya indirilemedi' })
    }

    // Base64'e çevir
    const arrayBuffer = await fileData.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    // Dosya türüne göre media type
    const mediaType = doc.file_type.toLowerCase() === 'png'
      ? 'image/png'
      : doc.file_type.toLowerCase() === 'pdf'
      ? 'application/pdf'
      : 'image/jpeg'

    // Claude Vision API — hem oku hem çevir
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: 'text',
              text: `Bu görseldeki Süryanice metni oku ve aşağıdaki formatta JSON olarak döndür:
{
  "syriac": "Görseldeki orijinal Süryanice metin",
  "turkish": "Metnin Türkçe tercümesi"
}

Sadece JSON döndür, başka açıklama ekleme.`,
            },
          ],
        }],
      }),
    })

    const claudeData = await claudeRes.json()

    if (!claudeRes.ok) {
      await supabase.from('source_documents').update({ status: 'error' }).eq('id', document_id)
      return NextResponse.json({ success: false, error: claudeData.error?.message || 'Claude API hatası' })
    }

    const responseText = claudeData.content?.[0]?.text || ''

    // JSON parse
    let syriacText = ''
    let turkishText = ''

    try {
      const clean = responseText.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      syriacText = parsed.syriac || ''
      turkishText = parsed.turkish || ''
    } catch {
      // JSON parse başarısız → tüm metni Süryanice olarak kaydet
      syriacText = responseText
      turkishText = ''
    }

    if (!syriacText.trim()) {
      await supabase.from('source_documents').update({ status: 'error' }).eq('id', document_id)
      return NextResponse.json({ success: false, error: 'Metin okunamadı' })
    }

    // Eski chunk'ları temizle
    await supabase.from('source_text_chunks').delete().eq('document_id', document_id)

    // Tek chunk olarak kaydet (tam metin)
    const { error: insertError } = await supabase
      .from('source_text_chunks')
      .insert({
        document_id,
        page_number: 1,
        chunk_index: 0,
        content: syriacText,
        translation_tr: turkishText || null,
      })

    if (insertError) {
      await supabase.from('source_documents').update({ status: 'error' }).eq('id', document_id)
      return NextResponse.json({ success: false, error: insertError.message })
    }

    // Status: done
    await supabase.from('source_documents').update({ status: 'done' }).eq('id', document_id)

    return NextResponse.json({
      success: true,
      chunks: 1,
      chars: syriacText.length,
      hasTranslation: !!turkishText,
    })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'OCR hatası',
    })
  }
}
