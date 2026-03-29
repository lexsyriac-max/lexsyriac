'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { useAuth } from '../../AuthContext'

export default function LoginPage() {
  const { signIn } = useAuth()
  const locale = useLocale()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      setError(error)
      setLoading(false)
      return
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.5rem',
    fontSize: '0.95rem',
    color: '#1f2937',
    backgroundColor: 'white',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.875rem',
    color: '#374151',
    marginBottom: '0.25rem',
  }

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
      <div style={{ width: '100%', maxWidth: '400px' }}>
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
            {locale === 'tr' ? 'Hesabınıza giriş yapın' : 'Sign in to your account'}
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
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>
                {locale === 'tr' ? 'E-posta' : 'Email'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="ornek@email.com"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>
                {locale === 'tr' ? 'Şifre' : 'Password'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                style={inputStyle}
              />
            </div>

            {error && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  borderRadius: '0.5rem',
                  padding: '0.625rem 0.75rem',
                  fontSize: '0.875rem',
                  marginBottom: '1rem',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.6rem 1rem',
                backgroundColor: loading ? '#6b9ea8' : '#1A5F6E',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.95rem',
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                marginBottom: '0.75rem',
              }}
            >
              {loading
                ? locale === 'tr'
                  ? 'Giriş yapılıyor…'
                  : 'Signing in…'
                : locale === 'tr'
                ? 'Giriş Yap'
                : 'Sign In'}
            </button>

            <div
              style={{
                textAlign: 'center',
                borderTop: '1px solid #f3f4f6',
                paddingTop: '0.75rem',
              }}
            >
              <Link
                href={`/${locale}`}
                style={{
                  display: 'inline-block',
                  padding: '0.5rem 1.5rem',
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
          </form>
        </div>
      </div>
    </main>
  )
}