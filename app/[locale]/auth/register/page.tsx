'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { createClient } from '../../../lib/supabase'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const locale = useLocale()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (error) {
      setError('Kayıt sırasında hata oluştu. Lütfen tekrar deneyin.')
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}>
        <div className="card" style={{ padding: '2.5rem', maxWidth: 400, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-primary)', marginBottom: '0.75rem' }}>
            E-postanı kontrol et
          </h2>
          <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
            <strong>{email}</strong> adresine doğrulama bağlantısı gönderdik.
            E-postanı onayladıktan sonra giriş yapabilirsin.
          </p>
          <Link href={`/${locale}/auth/login`} className="btn btn-primary" style={{ display: 'block', marginTop: '1.5rem' }}>
            Giriş Sayfasına Git
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 48, height: 48,
            background: 'var(--color-primary)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: '1.5rem',
            fontFamily: 'var(--font-display)',
            margin: '0 auto 0.75rem',
          }}>ܠ</div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            color: 'var(--color-primary)',
            marginBottom: '0.25rem',
          }}>Kayıt Ol</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            LexSyriac'a üye ol, ücretsiz
          </p>
        </div>

        {/* Form */}
        <div className="card" style={{ padding: '2rem' }}>
          <form onSubmit={handleRegister}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--color-text)',
                marginBottom: '0.375rem',
              }}>Ad Soyad</label>
              <input
                className="input"
                type="text"
                placeholder="Adınız Soyadınız"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--color-text)',
                marginBottom: '0.375rem',
              }}>E-posta</label>
              <input
                className="input"
                type="email"
                placeholder="ornek@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--color-text)',
                marginBottom: '0.375rem',
              }}>Şifre</label>
              <input
                className="input"
                type="password"
                placeholder="En az 6 karakter"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            {error && (
              <div style={{
                padding: '0.75rem',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: 8,
                color: '#DC2626',
                fontSize: '0.875rem',
                marginBottom: '1rem',
              }}>{error}</div>
            )}

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
            </button>
          </form>

          <div style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            fontSize: '0.875rem',
            color: 'var(--color-text-muted)',
          }}>
            Zaten hesabın var mı?{' '}
            <Link href={`/${locale}/auth/login`} style={{ color: 'var(--color-primary)', fontWeight: 500 }}>
              Giriş Yap
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
