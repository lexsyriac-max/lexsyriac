'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'

export default function ComingSoonPage() {
  const locale = useLocale()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1A5F6E 0%, #0F3D47 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{
        background: 'white',
        borderRadius: 24,
        padding: '3rem 2.5rem',
        maxWidth: 480,
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🌿</div>

        <h1 style={{
          fontSize: '2rem',
          fontWeight: 700,
          color: '#1A5F6E',
          marginBottom: '0.75rem',
        }}>
          LexSyriac
        </h1>

        <p style={{
          fontSize: '1.1rem',
          fontWeight: 600,
          color: '#374151',
          marginBottom: '0.5rem',
        }}>
          Yakında Hizmetinizdeyiz
        </p>

        <p style={{
          fontSize: '0.95rem',
          color: '#6B7280',
          lineHeight: 1.7,
          marginBottom: '2rem',
        }}>
          Süryanice–Türkçe–İngilizce sözlük platformu hazırlanıyor.
          Çok yakında erişime açılacak.
        </p>

        <div style={{
          background: '#F0F8FA',
          borderRadius: 12,
          padding: '1rem',
          marginBottom: '2rem',
          fontSize: '0.88rem',
          color: '#1A5F6E',
        }}>
          Admin misiniz?{' '}
          <Link href={`/${locale}/auth/login`} style={{ color: '#1A5F6E', fontWeight: 700 }}>
            Giriş yapın →
          </Link>
        </div>

        <div style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>
          © 2025 LexSyriac
        </div>
      </div>
    </div>
  )
}
