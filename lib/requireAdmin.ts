// Sunucu tarafı yetki denetimi: servis anahtarıyla çalışan API'ler yalnız
// giriş yapmış demo admin (profiles.role = 'admin') tarafından çağrılabilir.
// Middleware /api yollarını atladığı için denetim burada yapılır.
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function requireDemoAdmin(): Promise<NextResponse | null> {
  const store = await cookies()
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => store.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Giriş gerekli.' }, { status: 401 })
  }
  const { data } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (data?.role !== 'admin') {
    return NextResponse.json({ error: 'Yetki yok.' }, { status: 403 })
  }
  return null
}
