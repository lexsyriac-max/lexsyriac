'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

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
  const isActive = (path: string) => pathname.includes(path)

  return (
    <>
      <style>{`
        .nav-dropdown { position: relative; flex-shrink: 0; }
        .nav-dropdown summary { 
          display: flex; align-items: center; gap: 0.3rem;
          padding: 0.35rem 0.65rem; border-radius: 6px; cursor: pointer;
          font-size: 0.8rem; font-weight: 600; white-space: nowrap;
          color: rgba(255,255,255,0.8); list-style: none; user-select: none;
        }
        .nav-dropdown summary::-webkit-details-marker { display: none; }
        .nav-dropdown[open] summary { background: rgba(255,255,255,0.18); color: white; }
        .nav-dropdown summary:hover { background: rgba(255,255,255,0.12); color: white; }
        .nav-dropdown .dropdown-menu {
          position: fixed; top: 45px; left: auto;
          background: #0D3540; border: 1px solid rgba(255,255,255,0.15);
          border-radius: 8px; padding: 0.4rem; min-width: 190px;
          z-index: 9999; box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
        .nav-dropdown .dropdown-menu a {
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.5rem 0.75rem; border-radius: 6px;
          text-decoration: none; font-size: 0.82rem; white-space: nowrap;
          color: rgba(255,255,255,0.8); margin-bottom: 2px;
        }
        .nav-dropdown .dropdown-menu a:hover { background: rgba(255,255,255,0.1); color: white; }
        .nav-dropdown .dropdown-menu a.active { background: rgba(255,255,255,0.15); color: white; font-weight: 700; }
        .nav-arrow { font-size: 0.6rem; opacity: 0.7; margin-left: 2px; }
      `}</style>
      <nav style={{ background: '#0F3D47', borderBottom: '1px solid rgba(255,255,255,0.1)', position: 'sticky', top: 0, zIndex: 1000 }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0', flexWrap: 'nowrap', overflowX: 'auto' }}>
          
          <Link href={`/${locale}`} style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0, padding: '0.35rem 0.5rem' }}>
            ← Site
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0, fontSize: '0.8rem' }}>|</span>

          <Link href={`/${locale}/admin`} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.65rem', borderRadius: 6, textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, background: pathname === `/${locale}/admin` ? 'rgba(255,255,255,0.18)' : 'transparent', color: 'white' }}>
            📊 Dashboard
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0, fontSize: '0.8rem' }}>|</span>

          {NAV_GROUPS.map(group => {
            const hasActive = group.items.some(item => isActive(item.path))
            return (
              <details key={group.label} className="nav-dropdown">
                <summary style={{ background: hasActive ? 'rgba(255,255,255,0.18)' : undefined, color: hasActive ? 'white' : undefined }}>
                  {group.label} <span className="nav-arrow">▼</span>
                </summary>
                <div className="dropdown-menu">
                  {group.items.map(item => (
                    <Link key={item.path} href={`/${locale}${item.path}`} className={isActive(item.path) ? 'active' : ''}>
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              </details>
            )
          })}
        </div>
      </nav>
    </>
  )
}
