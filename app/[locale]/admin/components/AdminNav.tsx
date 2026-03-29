'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  locale: string
}

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊', path: '' },
  { key: 'words', label: 'Kelimeler', icon: '📖', path: '/words' },
  { key: 'categories', label: 'Kategoriler', icon: '🗂️', path: '/categories' },
  { key: 'grammar', label: 'Gramer', icon: '📝', path: '/grammar' },
  { key: 'pending', label: 'Pending', icon: '⏳', path: '/pending' },
  { key: 'import', label: 'İçe Aktar', icon: '⬆', path: '/import' },
  { key: 'lexscan', label: 'LexScan', icon: '📄', path: '/lexscan' },
  { key: 'sentences', label: 'Cümleler', icon: '✍️', path: '/sentences' },
  { key: 'users', label: 'Kullanıcılar', icon: '👥', path: '/users' },
]

export default function AdminNav({ locale }: Props) {
  const pathname = usePathname()

  return (
    <nav
      style={{
        background: '#0F3D47',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 52,
          gap: '0.25rem',
        }}
      >
        <Link
          href={`/${locale}`}
          style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.8rem',
            textDecoration: 'none',
            marginRight: '1rem',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          ← Site
        </Link>

        <span
          style={{
            color: 'rgba(255,255,255,0.25)',
            marginRight: '0.75rem',
            fontSize: '0.8rem',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Admin
        </span>

        <div
          style={{
            display: 'flex',
            gap: '0.15rem',
            overflowX: 'auto',
            paddingBottom: 2,
            scrollbarWidth: 'thin',
          }}
        >
          {NAV_ITEMS.map((item) => {
            const href = `/${locale}/admin${item.path}`
            const isActive =
              item.path === ''
                ? pathname === `/${locale}/admin`
                : pathname.startsWith(href)

            return (
              <Link
                key={item.key}
                href={href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: 8,
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 600 : 400,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  color: isActive ? 'white' : 'rgba(255,255,255,0.68)',
                  background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                  transition: 'all 0.15s',
                  flexShrink: 0,
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}