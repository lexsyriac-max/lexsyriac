'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

interface Props {
  locale: string
}

const NAV_GROUPS = [
  {
    label: 'Kelime',
    items: [
      { path: '/admin/words', icon: '📝', label: 'Kelime Ekle' },
      { path: '/admin/import', icon: '⬆', label: 'Toplu Yükle' },
      { path: '/admin/pending', icon: '⏳', label: 'Pending' },
      { path: '/admin/lexscan', icon: '📄', label: 'LexScan' },
    ]
  },
  {
    label: 'Gramer',
    items: [
      { path: '/admin/grammar-engine', icon: '⚙️', label: 'Grammar Engine' },
      { path: '/admin/grammar', icon: '📚', label: 'Gramer Kuralları' },
      { path: '/admin/rules', icon: '✏️', label: 'Kural Editörü' },
    ]
  },
  {
    label: 'Cümle',
    items: [
      { path: '/admin/sentences', icon: '🔥', label: 'Cümle Motoru' },
      { path: '/admin/sentence-manage', icon: '📋', label: 'Cümle Yönetimi' },
    ]
  },
  {
    label: 'Sistem',
    items: [
      { path: '/admin/categories', icon: '🗂️', label: 'Kategoriler' },
      { path: '/admin/users', icon: '👥', label: 'Kullanıcılar' },
    ]
  },
]

export default function AdminNav({ locale }: Props) {
  const pathname = usePathname()
  const [openGroup, setOpenGroup] = useState<string | null>(null)

  const isActive = (path: string) => pathname.includes(path)

  return (
    <nav style={{ background: '#0F3D47', borderBottom: '1px solid rgba(255,255,255,0.1)', position: 'sticky', top: 0, zIndex: 100 }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0', flexWrap: 'nowrap', overflowX: 'auto' }}>
        
        {/* Site linki */}
        <Link href={`/${locale}`} style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0, padding: '0.35rem 0.5rem' }}>
          ← Site
        </Link>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.78rem', flexShrink: 0 }}>|</span>

        {/* Dashboard */}
        <Link href={`/${locale}/admin`} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.65rem', borderRadius: 6, textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, background: pathname === `/${locale}/admin` ? 'rgba(255,255,255,0.15)' : 'transparent', color: 'white' }}>
          📊 Dashboard
        </Link>

        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.78rem', flexShrink: 0 }}>|</span>

        {/* Gruplar */}
        {NAV_GROUPS.map(group => {
          const hasActive = group.items.some(item => isActive(item.path))
          const isOpen = openGroup === group.label
          return (
            <div key={group.label} style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => setOpenGroup(isOpen ? null : group.label)}
                onBlur={() => setTimeout(() => setOpenGroup(null), 150)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.65rem', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', background: hasActive || isOpen ? 'rgba(255,255,255,0.15)' : 'transparent', color: hasActive ? 'white' : 'rgba(255,255,255,0.75)' }}
              >
                {group.label} <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>▼</span>
              </button>
              {isOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, background: '#0F3D47', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '0.4rem', minWidth: 180, zIndex: 200, marginTop: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                  {group.items.map(item => (
                    <Link key={item.path} href={`/${locale}${item.path}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: 6, textDecoration: 'none', fontSize: '0.82rem', whiteSpace: 'nowrap', background: isActive(item.path) ? 'rgba(255,255,255,0.15)' : 'transparent', color: isActive(item.path) ? 'white' : 'rgba(255,255,255,0.8)', fontWeight: isActive(item.path) ? 700 : 400 }}>
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </nav>
  )
}
