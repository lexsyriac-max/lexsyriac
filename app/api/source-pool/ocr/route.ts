import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import Tesseract from 'tesseract.js'

const CHUNK_SIZE = 500 // karakter başına chunk

function splitIntoChunks(text: string, size: number): string[] {
  const chunks: string[] = []
  const sentences = text.split(/(?<=[.!?])\s+/)
  let current = ''

  for (const sentence of sentences) {
    if ((current + sentence).length > size && current.length > 0) {
      chunks.push(current.trim())
      current = sentence
    } else {
      current += (current ? ' ' : '') + sentence
    }
  }

  if (current.trim()) chunks.push(current.trim())
  return chunks.filter((c) => c.length > 10)
}

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
      await supabase
        .from('source_documents')
        .update({ status: 'error' })
        .eq('id', document_id)
      return NextResponse.json({ success: false, error: 'Dosya indirilemedi' })
    }

    // Buffer'a çevir
    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // OCR — Tesseract.js
    let extractedText = ''
    try {
      const { data } = await Tesseract.recognize(buffer, 'tur+eng+syr', {
        logger: () => {}, // sessiz
      })
      extractedText = data.text || ''
    } catch {
      // OCR başarısız olursa boş metin ile devam et
      extractedText = ''
    }

    if (!extractedText.trim()) {
      await supabase
        .from('source_documents')
        .update({ status: 'error' })
        .eq('id', document_id)
      return NextResponse.json({ success: false, error: 'Metin çıkarılamadı' })
    }

    // Önce eski chunk'ları temizle
    await supabase
      .from('source_text_chunks')
      .delete()
      .eq('document_id', document_id)

    // Chunk'lara böl ve kaydet
    const chunks = splitIntoChunks(extractedText, CHUNK_SIZE)
    const chunkRows = chunks.map((content, index) => ({
      document_id,
      page_number: 1,
      chunk_index: index,
      content,
    }))

    const { error: insertError } = await supabase
      .from('source_text_chunks')
      .insert(chunkRows)

    if (insertError) {
      await supabase
        .from('source_documents')
        .update({ status: 'error' })
        .eq('id', document_id)
      return NextResponse.json({ success: false, error: insertError.message })
    }

    // Status: done
    await supabase
      .from('source_documents')
      .update({ status: 'done' })
      .eq('id', document_id)

    return NextResponse.json({
      success: true,
      chunks: chunks.length,
      chars: extractedText.length,
    })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'OCR hatası',
    })
  }
}
