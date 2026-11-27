'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

interface Props { locale: string }

// Menü yalnız yeni sistemi (lex) gösterir; her modül bitince kendi grubu eklenir.
// Eski demo araçları "Demo arşivi" sayfasında durur (/admin/demo, yalnız demo admin).
// Envanter: mimari/Demo_Envanteri.md

type Viewer = { demoAdmin: boolean; lexRole: string | null }

type NavItem = {
  path: string                      // locale'siz yol, ör. /admin/lex/kaynak
  label: string
  match?: (rest: string) => boolean // locale'siz yol için etkinlik denetimi
  show?: (v: Viewer) => boolean
}
type NavGroup = { label: string; items: NavItem[] }

const under = (base: string) => (rest: string) => rest === base || rest.startsWith(base + '/')

const NAV_GROUPS: NavGroup[] = [
  { label: 'Sözlük', items: [
    { path: '/admin/lex', label: 'Maddeler',
      match: (r) => r === '/admin/lex' || (r.startsWith('/admin/lex/madde/') && r !== '/admin/lex/madde/yeni') },
    { path: '/admin/lex/madde/yeni', label: '+ Yeni madde', match: (r) => r === '/admin/lex/madde/yeni' },
    { path: '/admin/lex/inceleme', label: 'İnceleme kuyruğu' },
    { path: '/admin/lex/kategori', label: 'Kategoriler' },
    { path: '/admin/lex/kaynak', label: 'Kaynaklar' },
  ]},
  { label: 'Dilbilgisi', items: [
    { path: '/admin/lex/paradigma', label: 'Çekim sınıfları' },
  ]},
  { label: 'Öğren', items: [
    { path: '/admin/lex/ogren', label: 'Üniteler ve dersler' },
  ]},
  { label: 'Ekip', items: [
    { path: '/admin/lex/ekip', label: 'Ekip', show: (v) => v.lexRole === 'admin' },
  ]},
]

const DEMO_PATHS = [
  '/admin/demo', '/admin/words', '/admin/import', '/admin/pending', '/admin/lexscan',
  '/admin/grammar-engine', '/admin/grammar', '/admin/rules', '/admin/sentences',
  '/admin/sentence-manage', '/admin/categories', '/admin/users', '/admin/source-pool',
  '/admin/create-user', '/admin/update-role', '/admin/conjugation',
]

export default function AdminNav({ locale }: Props) {
  const pathname = usePathname()
  const rest = pathname.startsWith(`/${locale}`) ? pathname.slice(locale.length + 1) || '/' : pathname
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [dropdownLeft, setDropdownLeft] = useState(0)
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [viewer, setViewer] = useState<Viewer>({ demoAdmin: false, lexRole: null })

  useEffect(() => {
    let alive = true
    const apply = (v: Viewer) => { if (alive) setViewer(v) }
    const sb = createClient()
    sb.auth.getSession()
      .then(async ({ data: { session } }): Promise<Viewer> => {
        if (!session) return { demoAdmin: false, lexRole: null }
        const uid = session.user.id
        const [p, l] = await Promise.all([
          sb.from('profiles').select('role').eq('id', uid).maybeSingle(),
          sb.schema('lex').from('user_role').select('role').eq('user_id', uid).maybeSingle(),
        ])
        return { demoAdmin: p.data?.role === 'admin', lexRole: (l.data?.role as string | undefined) ?? null }
      })
      .then(apply)
    return () => { alive = false }
  }, [])

  // Sayfa değişince açık menüyü kapat
  useEffect(() => {
    const t = setTimeout(() => setOpenGroup(null), 0)
    return () => clearTimeout(t)
  }, [pathname])

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }, [])

  // Dokunmatik ekranda menü dışına dokununca kapat (fareyle üstüne gelince açılır,
  // tıklama yalnız açar; kapatma ayrılınca, dışarı dokununca ya da sayfa değişince)
  useEffect(() => {
    if (!openGroup) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node | null
      const inButton = Object.values(buttonRefs.current).some((b) => b && t && b.contains(t))
      const inMenu = t instanceof Element && t.closest('[data-admin-dropdown]')
      if (!inButton && !inMenu) setOpenGroup(null)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [openGroup])

  const groups = NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((it) => !it.show || it.show(viewer)) }))
    .filter((g) => g.items.length > 0)

  const isActive = (it: NavItem) => (it.match ?? under(it.path))(rest)
  const inDemo = DEMO_PATHS.some((p) => under(p)(rest))

  function openAt(label: string) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    const btn = buttonRefs.current[label]
    if (btn) setDropdownLeft(btn.getBoundingClientRect().left)
    setOpenGroup(label)
  }
  function closeSoon() {
    timeoutRef.current = setTimeout(() => setOpenGroup(null), 150)
  }
  function keepOpen() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }

  const currentGroup = groups.find((g) => g.label === openGroup)

  const tabStyle = (on: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.65rem', borderRadius: 6,
    border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
    textDecoration: 'none', background: on ? 'rgba(255,255,255,0.18)' : 'transparent',
    color: on ? 'white' : 'rgba(255,255,255,0.8)',
  })

  return (
    <nav style={{ background: '#0F3D47', borderBottom: '1px solid rgba(255,255,255,0.1)', position: 'sticky', top: 0, zIndex: 1000 }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0', flexWrap: 'nowrap', overflowX: 'auto' }}>

        <Link href={`/${locale}`} style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0, padding: '0.35rem 0.5rem' }}>
          ← Site
        </Link>
        <span style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>|</span>

        {groups.map((group) => {
          const hasActive = group.items.some(isActive)
          // Tek öğeli grup doğrudan bağlantıdır
          if (group.items.length === 1) {
            const it = group.items[0]
            return (
              <Link key={group.label} href={`/${locale}${it.path}`} style={tabStyle(hasActive)}>
                {it.label}
              </Link>
            )
          }
          const isOpen = openGroup === group.label
          return (
            <button
              key={group.label}
              type="button"
              ref={(el) => { buttonRefs.current[group.label] = el }}
              onMouseEnter={() => openAt(group.label)}
              onMouseLeave={closeSoon}
              onClick={() => openAt(group.label)}
              aria-expanded={isOpen}
              style={tabStyle(hasActive || isOpen)}
            >
              {group.label} <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>▼</span>
            </button>
          )
        })}

        {viewer.demoAdmin && (
          <Link
            href={`/${locale}/admin/demo`}
            title="Eski demo sitenin yönetim araçları"
            style={{ ...tabStyle(inDemo), marginLeft: 'auto', fontWeight: 400, fontSize: '0.75rem', color: inDemo ? 'white' : 'rgba(255,255,255,0.45)' }}
          >
            Demo arşivi
          </Link>
        )}
      </div>

      {openGroup && currentGroup && (
        <div
          data-admin-dropdown
          onMouseEnter={keepOpen}
          onMouseLeave={closeSoon}
          style={{ position: 'fixed', top: 45, left: dropdownLeft, background: '#0D3540', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '0.4rem', minWidth: 190, zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
        >
          {currentGroup.items.map((item) => {
            const on = isActive(item)
            return (
              <Link
                key={item.path}
                href={`/${locale}${item.path}`}
                onClick={() => setOpenGroup(null)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: 6, textDecoration: 'none', fontSize: '0.82rem', whiteSpace: 'nowrap', background: on ? 'rgba(255,255,255,0.12)' : 'transparent', color: on ? 'white' : 'rgba(255,255,255,0.8)', fontWeight: on ? 700 : 400, marginBottom: 2 }}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      )}
    </nav>
  )
}
