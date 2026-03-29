'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { createClient } from '../../../lib/supabase'

type Profile = {
  id: string
  email: string | null
  full_name: string | null
  role: string | null
}

type NewUserRole = 'member' | 'admin'

export default function AdminUsersPage() {
  const locale = useLocale()
  const supabase = createClient()

  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [creatingUser, setCreatingUser] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState<NewUserRole>('member')

  const loadUsers = async () => {
    setLoading(true)
    setErrorMessage(null)

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .order('created_at', { ascending: false })

    if (error) {
      setErrorMessage(error.message)
    } else if (data) {
      setUsers(data)
    }

    setLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const updateRole = async (userId: string, newRole: 'member' | 'admin') => {
    setSavingId(userId)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const response = await fetch('/api/admin/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      })

      const result = await response.json()

      if (!response.ok) {
        setErrorMessage(result.error || 'Rol güncellenemedi.')
        setSavingId(null)
        return
      }

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      )

      setSuccessMessage('Kullanıcı rolü güncellendi.')
    } catch {
      setErrorMessage('Rol güncelleme sırasında bağlantı hatası oluştu.')
    }

    setSavingId(null)
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setErrorMessage('Ad, e-posta ve şifre zorunlu.')
      return
    }

    setCreatingUser(true)

    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password: password.trim(),
          role: newUserRole,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setErrorMessage(result.error || 'Kullanıcı oluşturulamadı.')
        setCreatingUser(false)
        return
      }

      setSuccessMessage('Yeni kullanıcı oluşturuldu.')
      setFullName('')
      setEmail('')
      setPassword('')
      setNewUserRole('member')
      await loadUsers()
    } catch {
      setErrorMessage('Kullanıcı oluşturma sırasında bağlantı hatası oluştu.')
    }

    setCreatingUser(false)
  }

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()

    if (!q) return users

    return users.filter((user) => {
      const currentFullName = user.full_name?.toLowerCase() || ''
      const currentEmail = user.email?.toLowerCase() || ''
      const currentRole = user.role?.toLowerCase() || ''

      return (
        currentFullName.includes(q) ||
        currentEmail.includes(q) ||
        currentRole.includes(q)
      )
    })
  }, [users, search])

  const getRoleStyle = (role: string | null) => {
    if (role === 'admin') {
      return {
        background: '#FDECEC',
        color: '#B42318',
        border: '1px solid #F5B5B0',
      }
    }

    return {
      background: '#FFF4E5',
      color: '#9A6A28',
      border: '1px solid #F3D19C',
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div
        style={{
          background: 'linear-gradient(135deg, var(--color-primary) 0%, #0F3D47 100%)',
          padding: '2rem 0',
        }}
      >
        <div className="container">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <p
                style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '0.8125rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: '0.375rem',
                }}
              >
                Admin Alanı
              </p>
              <h1
                style={{
                  color: 'white',
                  fontFamily: 'var(--font-display)',
                  fontSize: '2rem',
                  fontWeight: 700,
                }}
              >
                Kullanıcı Yönetimi
              </h1>
            </div>

            <Link
              href={`/${locale}/admin`}
              className="btn btn-ghost btn-sm"
              style={{
                color: 'rgba(255,255,255,0.9)',
                border: '1px solid rgba(255,255,255,0.25)',
              }}
            >
              ← Admin Panele Dön
            </Link>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '2rem 1.5rem 3rem' }}>
        {successMessage && (
          <div
            style={{
              marginBottom: '1rem',
              background: '#EEF8F1',
              border: '1px solid #B7DEC2',
              color: '#216A3A',
              borderRadius: 12,
              padding: '0.875rem 1rem',
              fontSize: '0.9rem',
            }}
          >
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              marginBottom: '1rem',
              background: '#FFF7F7',
              border: '1px solid #E5C7C7',
              color: '#A94442',
              borderRadius: 12,
              padding: '0.875rem 1rem',
              fontSize: '0.9rem',
            }}
          >
            {errorMessage}
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.25rem',
            alignItems: 'start',
          }}
        >
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2
              style={{
                fontSize: '1.1rem',
                marginBottom: '0.35rem',
                color: 'var(--color-text)',
              }}
            >
              Yeni Kullanıcı Oluştur
            </h2>

            <p
              style={{
                fontSize: '0.9rem',
                color: 'var(--color-text-muted)',
                marginBottom: '1rem',
              }}
            >
              Açık kayıt kapalıdır. Yeni hesaplar yalnızca admin tarafından eklenir.
            </p>

            <form onSubmit={handleCreateUser} style={{ display: 'grid', gap: '0.85rem' }}>
              <div>
                <label style={LS}>Ad Soyad</label>
                <input
                  className="input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Kullanıcı adı"
                />
              </div>

              <div>
                <label style={LS}>E-posta</label>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@email.com"
                />
              </div>

              <div>
                <label style={LS}>Şifre</label>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label style={LS}>Rol</label>
                <select
                  className="input"
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as NewUserRole)}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <button className="btn btn-primary" type="submit" disabled={creatingUser}>
                {creatingUser ? 'Oluşturuluyor...' : 'Kullanıcı Oluştur'}
              </button>
            </form>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
                marginBottom: '1rem',
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: '1.1rem',
                    marginBottom: '0.35rem',
                    color: 'var(--color-text)',
                  }}
                >
                  Kayıtlı Kullanıcılar
                </h2>
                <div
                  style={{
                    fontSize: '0.9rem',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Toplam: {filteredUsers.length} kullanıcı
                </div>
              </div>

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ad, e-posta veya role göre ara..."
                className="input"
                style={{ maxWidth: 320, width: '100%' }}
              />
            </div>

            {loading ? (
              <div style={{ color: 'var(--color-text-muted)' }}>Yükleniyor...</div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ color: 'var(--color-text-muted)' }}>
                Eşleşen kullanıcı bulunmuyor.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {filteredUsers.map((user) => {
                  const roleStyle = getRoleStyle(user.role)

                  return (
                    <div
                      key={user.id}
                      style={{
                        border: '1px solid var(--color-border)',
                        borderRadius: 12,
                        padding: '1rem',
                        background: 'white',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '1rem',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                        }}
                      >
                        <div className="text-break">
                          <div
                            style={{
                              fontWeight: 600,
                              color: 'var(--color-text)',
                              marginBottom: '0.25rem',
                            }}
                          >
                            {user.full_name || 'İsimsiz kullanıcı'}
                          </div>

                          <div
                            style={{
                              fontSize: '0.9rem',
                              color: 'var(--color-text-muted)',
                              marginBottom: '0.5rem',
                            }}
                          >
                            {user.email || '-'}
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              flexWrap: 'wrap',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '0.8rem',
                                color: 'var(--color-text-subtle)',
                              }}
                            >
                              Mevcut rol:
                            </span>

                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '0.25rem 0.65rem',
                                borderRadius: 999,
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                background: roleStyle.background,
                                color: roleStyle.color,
                                border: roleStyle.border,
                              }}
                            >
                              {user.role || 'member'}
                            </span>
                          </div>
                        </div>

                        <div className="btn-group-mobile" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-secondary"
                            disabled={savingId === user.id}
                            onClick={() => updateRole(user.id, 'member')}
                          >
                            {savingId === user.id ? 'Kaydediliyor...' : 'Member Yap'}
                          </button>

                          <button
                            className="btn btn-primary"
                            disabled={savingId === user.id}
                            onClick={() => updateRole(user.id, 'admin')}
                          >
                            {savingId === user.id ? 'Kaydediliyor...' : 'Admin Yap'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

const LS: React.CSSProperties = {
  display: 'block',
  fontSize: '0.82rem',
  fontWeight: 600,
  marginBottom: '0.35rem',
  color: 'var(--color-text)',
}