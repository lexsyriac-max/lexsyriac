import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const fullName = body?.fullName?.trim()
    const email = body?.email?.trim().toLowerCase()
    const password = body?.password?.trim()
    const role = body?.role === 'admin' ? 'admin' : 'member'

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { error: 'Ad soyad, e-posta ve şifre zorunlu.' },
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

    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role,
        },
      })

    if (authError) {
      return NextResponse.json(
        { error: authError.message || 'Auth kullanıcısı oluşturulamadı.' },
        { status: 400 }
      )
    }

    const userId = authData.user?.id

    if (!userId) {
      return NextResponse.json(
        { error: 'Kullanıcı oluşturuldu ama kullanıcı ID alınamadı.' },
        { status: 500 }
      )
    }

    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: userId,
      email,
      full_name: fullName,
      role,
    })

    if (profileError) {
      return NextResponse.json(
        {
          error: profileError.message || 'Profil kaydı oluşturulamadı.',
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email,
        full_name: fullName,
        role,
      },
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