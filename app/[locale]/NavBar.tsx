'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'

export default function NavBar() {
  const t = useTranslations('nav')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const navLinks = [
    { href: '/dictionary', label: t('dictionary') },
    { href: '/learn',      label: t('learn') },
    { href: '/sentences',  label: t('sentences') },
    { href: '/rules',      label: t('rules') },
    { href: '/resources',  label: t('sources') },
    { href: '/stats',      label: t('stats') },
  ]

  // Dil değiştirici — /tr/... → /en/... veya tersi
  const switchLocale = () => {
    const next = locale === 'tr' ? 'en' : 'tr'
    const stripped = pathname.replace(`/${locale}`, '') || '/'
    router.push(`/${next}${stripped}`)
  }

  return (
    <>
      <nav style={{
        height: 'var(--nav-height)',
        background: 'white',
        borderBottom: '1px solid var(--color-border)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div className="container" style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}>

          {/* Logo */}
          <Link href={`/${locale}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
            <div style={{
              width: 36, height: 36,
              background: 'var(--color-primary)',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '1.1rem', fontWeight: 700,
              fontFamily: 'var(--font-display)',
            }}>ܠ</div>
            <div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.125rem',
                fontWeight: 700,
                color: 'var(--color-primary)',
                lineHeight: 1,
              }}>LexSyriac</div>
              <div style={{
                fontSize: '0.6875rem',
                color: 'var(--color-text-subtle)',
                letterSpacing: '0.05em',
                whiteSpace: 'nowrap',
              }}>Türkçe · Süryanice · İngilizce</div>
            </div>
          </Link>

          {/* Nav linkleri — sadece masaüstü */}
          {!isMobile && (
            <div style={{ display: 'flex', gap: '0.25rem', flex: 1, justifyContent: 'center' }}>
              {navLinks.slice(0, 4).map(l => (
                <Link key={l.href} href={`/${locale}${l.href}`} className="btn btn-ghost btn-sm">
                  {l.label}
                </Link>
              ))}
            </div>
          )}

          {/* Sağ: butonlar veya hamburger */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
            {!isMobile ? (
              <>
                {/* Dil değiştirici */}
                <button
                  onClick={switchLocale}
                  className="btn btn-ghost btn-sm"
                  style={{ fontWeight: 600, minWidth: 40 }}
                >
                  {locale === 'tr' ? 'EN' : 'TR'}
                </button>
                <Link href={`/${locale}/auth/login`} className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setMenuOpen(false)}>{t('login')}</Link>
                <Link href={`/${locale}/auth/register`} className="btn btn-primary" style={{ flex: 1 }} onClick={() => setMenuOpen(false)}>{t('register')}</Link>
              </>
            ) : (
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                style={{
                  background: menuOpen ? 'var(--color-bg-subtle)' : 'none',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  padding: '0.4rem 0.75rem',
                  cursor: 'pointer',
                  fontSize: '1.125rem',
                  color: 'var(--color-text)',
                  lineHeight: 1,
                  transition: 'background 0.15s',
                }}
              >
                {menuOpen ? '✕' : '☰'}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobil Menü */}
      {menuOpen && isMobile && (
        <div
          style={{
            position: 'fixed',
            top: 'var(--nav-height)',
            left: 0, right: 0, bottom: 0,
            zIndex: 99,
            background: 'rgba(28,25,23,0.4)',
          }}
          onClick={() => setMenuOpen(false)}
        >
          <div
            style={{
              background: 'white',
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.125rem',
              borderBottom: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-md)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {navLinks.map(l => (
              <Link
                key={l.href}
                href={`/${locale}${l.href}`}
                onClick={() => setMenuOpen(false)}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 8,
                  color: 'var(--color-text)',
                  textDecoration: 'none',
                  fontWeight: 500,
                  fontSize: '0.9375rem',
                }}
              >{l.label}</Link>
            ))}
            <div style={{
              borderTop: '1px solid var(--color-border)',
              marginTop: '0.5rem',
              paddingTop: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}>
              <button
                onClick={switchLocale}
                className="btn btn-ghost"
                style={{ fontWeight: 600 }}
              >
                {locale === 'tr' ? '🇬🇧 English' : '🇹🇷 Türkçe'}
              </button>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary" style={{ flex: 1 }}>{t('login')}</button>
                <button className="btn btn-primary" style={{ flex: 1 }}>{t('register')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}