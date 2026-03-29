import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const userId = body?.userId
    const role = body?.role === 'admin' ? 'admin' : 'member'

    if (!userId) {
      return NextResponse.json(
        { error: 'Geçerli bir kullanıcı ID gerekli.' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Sunucu ortam değişkenleri eksik.' },
        { status: 500 }
      )
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: userData, error: getUserError } =
      await adminClient.auth.admin.getUserById(userId)

    if (getUserError) {
      return NextResponse.json(
        { error: getUserError.message || 'Kullanıcı alınamadı.' },
        { status: 400 }
      )
    }

    const currentMeta = userData.user?.user_metadata || {}

    const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(
      userId,
      {
        user_metadata: {
          ...currentMeta,
          role,
        },
      }
    )

    if (authUpdateError) {
      return NextResponse.json(
        { error: authUpdateError.message || 'Auth rolü güncellenemedi.' },
        { status: 400 }
      )
    }

    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ role })
      .eq('id', userId)

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message || 'Profil rolü güncellenemedi.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      userId,
      role,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Bilinmeyen sunucu hatası',
      },
      { status: 500 }
    )
  }
}