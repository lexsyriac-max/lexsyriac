import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  try {
    const { data: doc, error: docError } = await supabase
      .from('source_documents')
      .select('*')
      .eq('id', id)
      .single()

    if (docError) return NextResponse.json({ success: false, error: docError.message })

    const { data: chunks, error: chunkError } = await supabase
      .from('source_text_chunks')
      .select('*')
      .eq('document_id', id)
      .order('page_number', { ascending: true })
      .order('chunk_index', { ascending: true })

    if (chunkError) return NextResponse.json({ success: false, error: chunkError.message })

    return NextResponse.json({ success: true, data: { ...doc, chunks } })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'error',
    })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  try {
    const { error } = await supabase
      .from('source_documents')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ success: false, error: error.message })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'error',
    })
  }
}
