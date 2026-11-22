// Lex ekibi: lex.user_role yönetimi (yalnız lex admin).
// Rol yazma/silme çağıranın kendi oturumuyla yapılır (RLS: admin_write).
// Servis anahtarı yalnız e-posta ↔ kullanıcı eşlemesi için kullanılır.
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient, type User } from '@supabase/supabase-js'

const ROLES = ['contributor', 'editor', 'admin'] as const
type Role = (typeof ROLES)[number]

async function lexAdmin() {
  const store = await cookies()
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => store.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { denied: NextResponse.json({ error: 'Giriş gerekli.' }, { status: 401 }) }
  const { data: ok } = await sb.schema('lex').rpc('has_role', { min_role: 'admin' })
  if (ok !== true) return { denied: NextResponse.json({ error: 'Yalnız lex admin.' }, { status: 403 }) }
  return { sb, user }
}

async function allUsers(): Promise<User[]> {
  const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const out: User[] = []
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await svc.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    out.push(...data.users)
    if (data.users.length < 1000) break
  }
  return out
}

export async function GET() {
  const a = await lexAdmin()
  if (a.denied) return a.denied
  const { data: rows, error } = await a.sb.schema('lex').from('user_role')
    .select('user_id,role,granted_at,granted_by').order('granted_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const email = new Map((await allUsers()).map((u) => [u.id, u.email ?? '']))
  return NextResponse.json({
    me: a.user.id,
    members: (rows ?? []).map((r) => ({
      user_id: r.user_id,
      email: email.get(r.user_id) ?? '(silinmiş hesap)',
      role: r.role,
      granted_at: r.granted_at,
      granted_by: r.granted_by ? email.get(r.granted_by) ?? null : null,
    })),
  })
}

export async function POST(req: Request) {
  const a = await lexAdmin()
  if (a.denied) return a.denied
  const body = await req.json().catch(() => ({}))
  const mail = String(body?.email ?? '').trim().toLowerCase()
  const role = (body?.role ?? null) as Role | null
  if (!mail) return NextResponse.json({ error: 'E-posta gerekli.' }, { status: 400 })
  if (role !== null && !ROLES.includes(role)) {
    return NextResponse.json({ error: 'Geçersiz rol.' }, { status: 400 })
  }
  const target = (await allUsers()).find((u) => (u.email ?? '').toLowerCase() === mail)
  if (!target) {
    return NextResponse.json(
      { error: 'Bu e-postayla hesap yok. Önce Kullanıcılar ekranından hesap açılmalı.' },
      { status: 404 })
  }
  if (target.id === a.user.id && role !== 'admin') {
    return NextResponse.json({ error: 'Kendi admin rolünüzü kaldıramazsınız.' }, { status: 400 })
  }
  const t = a.sb.schema('lex').from('user_role')
  const { error } = role === null
    ? await t.delete().eq('user_id', target.id)
    : await t.upsert({ user_id: target.id, role, granted_by: a.user.id, granted_at: new Date().toISOString() })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
