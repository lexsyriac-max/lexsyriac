import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('sentence_errors')
      .select('root')
      .not('root', 'is', null)

    if (error) throw error

    const counts: Record<string, number> = {}
    for (const row of data || []) {
      if (row.root) counts[row.root] = (counts[row.root] || 0) + 1
    }

    const formatted = Object.entries(counts)
      .map(([root, error_count]) => ({ root, error_count }))
      .sort((a, b) => b.error_count - a.error_count)
      .slice(0, 10)

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('ERROR STATS API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
