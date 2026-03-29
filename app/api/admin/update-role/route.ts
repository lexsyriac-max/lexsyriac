import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const userId = body.userId as string | undefined
    const role = body.role as string | undefined

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'userId ve role gerekli.' },
        { status: 400 }
      )
    }

    if (!['member', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Geçersiz rol.' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ role })
      .eq('id', userId)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Rol güncelleme sırasında beklenmeyen bir hata oluştu.' },
      { status: 500 }
    )
  }
}