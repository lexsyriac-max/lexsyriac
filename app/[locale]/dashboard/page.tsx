'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { useAuth } from '../AuthContext'
import { createClient } from '@/lib/supabase'

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const locale = useLocale()
  const supabase = createClient()

  const [fullName, setFullName] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [checkingRole, setCheckingRole] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/${locale}/auth/login`)
    }
  }, [user, loading, locale, router])

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setCheckingRole(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single()

      if (!profile) {
        await signOut()
        router.replace(`/${locale}/auth/login`)
        return
      }

      if (profile.role === 'banned') {
        await signOut()
        router.replace(`/${locale}/auth/login?banned=1`)
        return
      }

      setFullName(profile.full_name ?? null)
      setRole(profile.role ?? null)
      setCheckingRole(false)
    }

    loadProfile()
  }, [user, supabase, signOut, locale, router])

  if (loading || checkingRole) {
    return (
      <main
        style={{
          minHeight: '100vh',
          background: 'var(--color-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ color: 'var(--color-text-muted)' }}>Yükleniyor...</div>
      </main>
    )
  }

  if (!user) return null

  const roleBadgeStyle =
    role === 'admin'
      ? {
          background: '#FDECEC',
          color: '#B42318',
          border: '1px solid #F5B5B0',
        }
      : {
          background: '#EEF6F8',
          color: '#1A5F6E',
          border: '1px solid #C7DCE1',
        }

  const quickLinks = [
    { href: `/${locale}/dictionary`, label: 'Sözlüğe Git' },
    { href: `/${locale}/learn`, label: 'Öğrenme Alanı' },
    { href: `/${locale}/sentences`, label: 'Cümle Alanı' },
    { href: `/${locale}/rules`, label: 'Kurallar' },
    { href: `/${locale}/resources`, label: 'Kaynaklar' },
    { href: `/${locale}/stats`, label: 'İstatistikler' },
    { href: `/${locale}`, label: 'Ana Sayfa' },
  ]

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, var(--color-primary) 0%, #0F3D47 100%)',
          padding: '2.75rem 0',
        }}
      >
        <div className="container">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ maxWidth: 760 }}>
              <p
                style={{
                  color: 'rgba(255,255,255,0.72)',
                  fontSize: '0.82rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: '0.45rem',
                }}
              >
                Üye Paneli
              </p>

              <h1
                style={{
                  color: 'white',
                  fontFamily: 'var(--font-display)',
                  fontSize: '2.1rem',
                  fontWeight: 700,
                  marginBottom: '0.65rem',
                }}
              >
                Hoş geldin{fullName ? `, ${fullName}` : ''}
              </h1>

              <p
                style={{
                  color: 'rgba(255,255,255,0.86)',
                  fontSize: '0.98rem',
                  lineHeight: 1.7,
                }}
              >
                Buradan profil bilgilerini görebilir, öğrenme alanlarına geçebilir
                ve sözlük sistemini daha düzenli şekilde kullanabilirsin.
              </p>
            </div>

            <div
              className="btn-group-mobile"
              style={{
                display: 'flex',
                gap: '0.75rem',
                flexWrap: 'wrap',
              }}
            >
              <Link
                href={`/${locale}`}
                className="btn btn-ghost btn-sm"
                style={{
                  color: 'rgba(255,255,255,0.92)',
                  border: '1px solid rgba(255,255,255,0.25)',
                }}
              >
                Ana Sayfaya Dön
              </Link>

              <button
                onClick={() => signOut()}
                className="btn btn-ghost btn-sm"
                style={{
                  color: 'rgba(255,255,255,0.92)',
                  border: '1px solid rgba(255,255,255,0.25)',
                }}
              >
                Çıkış
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '2rem 1.5rem 3rem' }}>
        <div
          className="responsive-grid-3"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.25rem',
          }}
        >
          <div className="card" style={{ padding: '1.5rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '1rem',
                marginBottom: '1rem',
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--color-text-subtle)',
                    marginBottom: '0.35rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Profil
                </p>

                <h2
                  style={{
                    margin: 0,
                    fontSize: '1.15rem',
                    color: 'var(--color-text)',
                  }}
                >
                  Hesap Bilgisi
                </h2>
              </div>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.3rem 0.7rem',
                  borderRadius: 999,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  background: roleBadgeStyle.background,
                  color: roleBadgeStyle.color,
                  border: roleBadgeStyle.border,
                }}
              >
                {role || 'member'}
              </span>
            </div>

            <div style={{ display: 'grid', gap: '0.9rem' }}>
              <div>
                <div
                  style={{
                    fontSize: '0.82rem',
                    color: 'var(--color-text-muted)',
                    marginBottom: '0.2rem',
                  }}
                >
                  Ad Soyad
                </div>
                <div style={{ fontSize: '1rem', color: 'var(--color-text)' }}>
                  {fullName || 'Belirtilmemiş'}
                </div>
              </div>

              <div className="text-break">
                <div
                  style={{
                    fontSize: '0.82rem',
                    color: 'var(--color-text-muted)',
                    marginBottom: '0.2rem',
                  }}
                >
                  E-posta
                </div>
                <div style={{ fontSize: '1rem', color: 'var(--color-text)' }}>
                  {user.email}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: '0.82rem',
                    color: 'var(--color-text-muted)',
                    marginBottom: '0.2rem',
                  }}
                >
                  Hesap Durumu
                </div>
                <div style={{ fontSize: '1rem', color: 'var(--color-text)' }}>
                  Aktif
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <p
              style={{
                fontSize: '0.8rem',
                color: 'var(--color-text-subtle)',
                marginBottom: '0.35rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Geçişler
            </p>

            <h2
              style={{
                margin: 0,
                fontSize: '1.15rem',
                color: 'var(--color-text)',
                marginBottom: '1rem',
              }}
            >
              Hızlı Erişim
            </h2>

            <div
              className="btn-group-mobile"
              style={{
                display: 'grid',
                gap: '0.75rem',
              }}
            >
              {quickLinks.map((item) => (
                <Link key={item.href} href={item.href} className="btn btn-secondary">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <p
              style={{
                fontSize: '0.8rem',
                color: 'var(--color-text-subtle)',
                marginBottom: '0.35rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Bilgi
            </p>

            <h2
              style={{
                margin: 0,
                fontSize: '1.15rem',
                color: 'var(--color-text)',
                marginBottom: '1rem',
              }}
            >
              Panel Durumu
            </h2>

            <div
              style={{
                background: 'var(--color-bg-subtle)',
                border: '1px solid var(--color-border)',
                borderRadius: 14,
                padding: '1rem',
              }}
            >
              <div
                style={{
                  fontSize: '0.95rem',
                  color: 'var(--color-text)',
                  marginBottom: '0.35rem',
                  fontWeight: 600,
                }}
              >
                Oturum açık
              </div>

              <div
                style={{
                  fontSize: '0.88rem',
                  color: 'var(--color-text-muted)',
                  lineHeight: 1.6,
                }}
              >
                Sistem hesabını doğru şekilde tanıdı. Öğrenme alanlarına geçebilir,
                sözlükte arama yapabilir ve kullanıcı panelini kullanabilirsin.
              </div>
            </div>

            <div
              style={{
                marginTop: '1rem',
                display: 'grid',
                gap: '0.75rem',
              }}
            >
              <div
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 12,
                  padding: '0.9rem 1rem',
                }}
              >
                <div
                  style={{
                    fontSize: '0.82rem',
                    color: 'var(--color-text-muted)',
                    marginBottom: '0.2rem',
                  }}
                >
                  Yetki
                </div>
                <div style={{ fontSize: '0.95rem', color: 'var(--color-text)' }}>
                  {role === 'admin'
                    ? 'Bu hesap admin rolüne sahip olsa da yönetim işlemleri ayrı admin panelinden yürütülür.'
                    : 'Standart kullanıcı erişimi aktif.'}
                </div>
              </div>

              <div
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 12,
                  padding: '0.9rem 1rem',
                }}
              >
                <div
                  style={{
                    fontSize: '0.82rem',
                    color: 'var(--color-text-muted)',
                    marginBottom: '0.2rem',
                  }}
                >
                  Sonraki Adım
                </div>
                <div style={{ fontSize: '0.95rem', color: 'var(--color-text)' }}>
                  Sözlükte arama yapabilir, öğrenme alanına geçebilir veya cümle ekranını inceleyebilirsin.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}