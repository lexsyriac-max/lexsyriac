'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'

interface Props { locale: string }

const NAV_GROUPS = [
  { label: 'Kelime', items: [
    { path: '/admin/words', icon: '📝', label: 'Kelime Ekle' },
    { path: '/admin/import', icon: '⬆', label: 'Toplu Yükle' },
    { path: '/admin/pending', icon: '⏳', label: 'Pending' },
    { path: '/admin/lexscan', icon: '📄', label: 'LexScan' },
  ]},
  { label: 'Gramer', items: [
    { path: '/admin/grammar-engine', icon: '⚙️', label: 'Grammar Engine' },
    { path: '/admin/grammar', icon: '📚', label: 'Gramer Kuralları' },
    { path: '/admin/rules', icon: '✏️', label: 'Kural Editörü' },
  ]},
  { label: 'Cümle', items: [
    { path: '/admin/sentences', icon: '🔥', label: 'Cümle Motoru' },
    { path: '/admin/sentence-manage', icon: '📋', label: 'Cümle Yönetimi' },
  ]},
  { label: 'Sistem', items: [
    { path: '/admin/categories', icon: '🗂️', label: 'Kategoriler' },
    { path: '/admin/users', icon: '👥', label: 'Kullanıcılar' },
    { path: '/admin/source-pool', icon: '📂', label: 'Kaynak Havuzu' },
  ]},
]

export default function AdminNav({ locale }: Props) {
  const pathname = usePathname()
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [dropdownLeft, setDropdownLeft] = useState(0)
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const isActive = (path: string) => pathname.includes(path)

  function handleMouseEnter(label: string) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    const btn = buttonRefs.current[label]
    if (btn) {
      const rect = btn.getBoundingClientRect()
      setDropdownLeft(rect.left)
    }
    setOpenGroup(label)
  }

  function handleMouseLeave() {
    timeoutRef.current = setTimeout(() => setOpenGroup(null), 150)
  }

  function handleDropdownEnter() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }, [])

  const currentGroup = NAV_GROUPS.find(g => g.label === openGroup)

  return (
    <nav style={{ background: '#0F3D47', borderBottom: '1px solid rgba(255,255,255,0.1)', position: 'sticky', top: 0, zIndex: 1000 }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0', flexWrap: 'nowrap', overflowX: 'auto' }}>

        <Link href={`/${locale}`} style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0, padding: '0.35rem 0.5rem' }}>
          ← Site
        </Link>
        <span style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>|</span>

        <Link href={`/${locale}/admin`} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.65rem', borderRadius: 6, textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, background: pathname === `/${locale}/admin` ? 'rgba(255,255,255,0.18)' : 'transparent', color: 'white' }}>
          📊 Dashboard
        </Link>
        <span style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>|</span>

        {NAV_GROUPS.map(group => {
          const hasActive = group.items.some(item => isActive(item.path))
          const isOpen = openGroup === group.label
          return (
            <button
              key={group.label}
              ref={el => { buttonRefs.current[group.label] = el }}
              onMouseEnter={() => handleMouseEnter(group.label)}
              onMouseLeave={handleMouseLeave}
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.65rem', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, background: hasActive || isOpen ? 'rgba(255,255,255,0.18)' : 'transparent', color: hasActive || isOpen ? 'white' : 'rgba(255,255,255,0.8)' }}
            >
              {group.label} <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>▼</span>
            </button>
          )
        })}
      </div>

      {/* Dropdown — position fixed, üstte */}
      {openGroup && currentGroup && (
        <div
          onMouseEnter={handleDropdownEnter}
          onMouseLeave={handleMouseLeave}
          style={{ position: 'fixed', top: 45, left: dropdownLeft, background: '#0D3540', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '0.4rem', minWidth: 190, zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
        >
          {currentGroup.items.map(item => (
            <Link
              key={item.path}
              href={`/${locale}${item.path}`}
              onClick={() => setOpenGroup(null)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: 6, textDecoration: 'none', fontSize: '0.82rem', whiteSpace: 'nowrap', background: isActive(item.path) ? 'rgba(255,255,255,0.12)' : 'transparent', color: isActive(item.path) ? 'white' : 'rgba(255,255,255,0.8)', fontWeight: isActive(item.path) ? 700 : 400, marginBottom: 2 }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}
