'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'

export default function RegisterPage() {
  const locale = useLocale()

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 1rem',
        backgroundColor: '#FAF7F2',
      }}
    >
      <div style={{ width: '100%', maxWidth: '460px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1
            style={{
              color: '#1A5F6E',
              fontSize: '2rem',
              fontWeight: 600,
              marginBottom: '0.25rem',
            }}
          >
            LexSyriac
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            {locale === 'tr'
              ? 'Kayıt işlemleri yönetici tarafından yapılır'
              : 'Accounts are created by an administrator'}
          </p>
        </div>

        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            border: '1px solid #e5e7eb',
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFF8E8',
              border: '1px solid #F3D9A6',
              color: '#8A6120',
              borderRadius: '0.5rem',
              padding: '0.9rem 1rem',
              fontSize: '0.92rem',
              lineHeight: 1.6,
              marginBottom: '1rem',
            }}
          >
            {locale === 'tr'
              ? 'Bu platformda açık kayıt kapalıdır. Yeni kullanıcı hesapları yalnızca yönetici tarafından oluşturulur.'
              : 'Open sign-up is disabled on this platform. New user accounts are created only by an administrator.'}
          </div>

          <div
            style={{
              display: 'grid',
              gap: '0.75rem',
            }}
          >
            <Link
              href={`/${locale}/auth/login`}
              style={{
                display: 'inline-block',
                width: '100%',
                textAlign: 'center',
                padding: '0.7rem 1rem',
                backgroundColor: '#1A5F6E',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.95rem',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              {locale === 'tr' ? 'Giriş Sayfasına Git' : 'Go to Login'}
            </Link>

            <Link
              href={`/${locale}`}
              style={{
                display: 'inline-block',
                width: '100%',
                textAlign: 'center',
                padding: '0.65rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                color: '#6b7280',
                textDecoration: 'none',
              }}
            >
              {locale === 'tr' ? '← Ana Sayfaya Dön' : '← Back to Home'}
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}