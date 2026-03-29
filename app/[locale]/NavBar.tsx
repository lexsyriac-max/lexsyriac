'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from './AuthContext'
import { createClient } from '@/lib/supabase'

export default function NavBar() {
  const t = useTranslations('nav')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const supabase = createClient()

  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const loadRole = async () => {
      if (!user) {
        setRole(null)
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (error) {
        setRole('member')
        return
      }

      setRole(profile?.role ?? 'member')
    }

    loadRole()
  }, [user, supabase])

  const navLinks = [
    { href: '/dictionary', label: t('dictionary') },
    { href: '/categories', label: 'Kategoriler' },
    { href: '/learn', label: t('learn') },
    { href: '/sentences', label: t('sentences') },
    { href: '/rules', label: t('rules') },
    { href: '/resources', label: t('sources') },
    { href: '/stats', label: t('stats') },
  ]

  const switchLocale = () => {
    const next = locale === 'tr' ? 'en' : 'tr'
    const stripped = pathname.replace(`/${locale}`, '') || '/'
    router.push(`/${next}${stripped}`)
  }

  const panelHref = role === 'admin' ? `/${locale}/admin` : `/${locale}/dashboard`
  const panelLabel = role === 'admin' ? 'Admin Panel' : 'Dashboard'

  return (
    <>
      <nav
        style={{
          height: 'var(--nav-height)',
          background: 'white',
          borderBottom: '1px solid var(--color-border)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          className="container"
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <Link
            href={`/${locale}`}
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              flexShrink: 0,
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                background: 'var(--color-primary)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1.1rem',
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                flexShrink: 0,
              }}
            >
              ܠ
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  lineHeight: 1,
                }}
              >
                LexSyriac
              </div>
              {!isMobile && (
                <div
                  style={{
                    fontSize: '0.6875rem',
                    color: 'var(--color-text-subtle)',
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Türkçe · Süryanice · İngilizce
                </div>
              )}
            </div>
          </Link>

          {!isMobile && (
            <div
              style={{
                display: 'flex',
                gap: '0.25rem',
                flex: 1,
                justifyContent: 'center',
                minWidth: 0,
                flexWrap: 'wrap',
              }}
            >
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={`/${locale}${link.href}`}
                  className="btn btn-ghost btn-sm"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            {!isMobile ? (
              <>
                <button
                  onClick={switchLocale}
                  className="btn btn-ghost btn-sm"
                  style={{ fontWeight: 600, minWidth: 44 }}
                >
                  {locale === 'tr' ? 'EN' : 'TR'}
                </button>

                {user ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <Link href={panelHref} className="btn btn-ghost btn-sm">
                      {panelLabel}
                    </Link>

                    <button
                      onClick={() => signOut()}
                      className="btn btn-ghost btn-sm"
                    >
                      Çıkış
                    </button>
                  </div>
                ) : (
                  <Link
                    href={`/${locale}/auth/login`}
                    className="btn btn-secondary"
                  >
                    {t('login')}
                  </Link>
                )}
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

      {menuOpen && isMobile && (
        <div
          style={{
            position: 'fixed',
            top: 'var(--nav-height)',
            left: 0,
            right: 0,
            bottom: 0,
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
            onClick={(e) => e.stopPropagation()}
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={`/${locale}${link.href}`}
                onClick={() => setMenuOpen(false)}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 8,
                  color: 'var(--color-text)',
                  textDecoration: 'none',
                  fontWeight: 500,
                  fontSize: '0.9375rem',
                }}
              >
                {link.label}
              </Link>
            ))}

            <div
              style={{
                borderTop: '1px solid var(--color-border)',
                marginTop: '0.5rem',
                paddingTop: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <button
                onClick={switchLocale}
                className="btn btn-ghost"
                style={{ fontWeight: 600 }}
              >
                {locale === 'tr' ? '🇬🇧 English' : '🇹🇷 Türkçe'}
              </button>

              {user ? (
                <>
                  <Link
                    href={panelHref}
                    className="btn btn-secondary"
                    onClick={() => setMenuOpen(false)}
                  >
                    {panelLabel}
                  </Link>

                  <button
                    onClick={async () => {
                      setMenuOpen(false)
                      await signOut()
                    }}
                    className="btn btn-primary"
                  >
                    Çıkış
                  </button>
                </>
              ) : (
                <Link
                  href={`/${locale}/auth/login`}
                  className="btn btn-secondary"
                  onClick={() => setMenuOpen(false)}
                >
                  {t('login')}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}