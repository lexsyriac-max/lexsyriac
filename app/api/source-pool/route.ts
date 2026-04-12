import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET() {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('source_documents')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ success: false, error: error.message })

    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'error',
    })
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await req.json()
    const { title, file_name, file_type, storage_path, language, page_count } = body

    if (!title || !file_name || !file_type || !storage_path) {
      return NextResponse.json({ success: false, error: 'Eksik alan' })
    }

    const { data, error } = await supabase
      .from('source_documents')
      .insert({ title, file_name, file_type, storage_path, language, page_count })
      .select()
      .single()

    if (error) return NextResponse.json({ success: false, error: error.message })

    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'error',
    })
  }
}
