'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { adminPages } from '@/config/admin-menu'

interface Props {
  locale: string
}

export default function AdminNav({ locale }: Props) {
  const pathname = usePathname()

  const navItems = adminPages
    .filter((page) => page.enabled)
    .sort((a, b) => a.order - b.order)

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
          alignItems: 'flex-start',
          gap: '0.5rem',
          paddingTop: '0.5rem',
          paddingBottom: '0.5rem',
        }}
      >
        <Link
          href={`/${locale}`}
          style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.8rem',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            padding: '0.4rem 0.2rem',
          }}
        >
          ← Site
        </Link>

        <span
          style={{
            color: 'rgba(255,255,255,0.25)',
            fontSize: '0.8rem',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            padding: '0.4rem 0.2rem',
          }}
        >
          Admin
        </span>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.35rem',
            flex: 1,
            minWidth: 0,
          }}
        >
          <Link
            href={`/${locale}/admin`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.4rem 0.75rem',
              borderRadius: 8,
              fontSize: '0.82rem',
              fontWeight: pathname === `/${locale}/admin` ? 600 : 400,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              color: pathname === `/${locale}/admin` ? 'white' : 'rgba(255,255,255,0.68)',
              background: pathname === `/${locale}/admin` ? 'rgba(255,255,255,0.15)' : 'transparent',
              transition: 'all 0.15s',
            }}
          >
            <span>📊</span>
            <span>Dashboard</span>
          </Link>

          {navItems.map((page) => {
            const href = `/${locale}${page.path}`
            const isActive = pathname.startsWith(href)

            return (
              <Link
                key={page.id}
                href={href}
                title={page.description_tr || page.description || page.label_tr || page.label}
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
                }}
              >
                <span>{page.icon}</span>
                <span>{page.label_tr || page.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
