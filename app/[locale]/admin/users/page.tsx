'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase'

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
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
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

  async function handleDeleteUser(userId: string, name: string) {
    if (!confirm(`"${name}" kalıcı olarak silinsin mi?`)) return

    setDeletingId(userId)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      const result = await response.json()

      if (!response.ok) {
        setErrorMessage(result.error || 'Kullanıcı silinemedi.')
        setDeletingId(null)
        return
      }

      setSuccessMessage(`"${name}" silindi.`)
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    } catch {
      setErrorMessage('Silme sırasında bağlantı hatası oluştu.')
    }

    setDeletingId(null)
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
      setShowForm(false)
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
      const n = user.full_name?.toLowerCase() || ''
      const em = user.email?.toLowerCase() || ''
      const r = user.role?.toLowerCase() || ''
      return n.includes(q) || em.includes(q) || r.includes(q)
    })
  }, [users, search])

  const getRoleStyle = (role: string | null) => {
    if (role === 'admin') {
      return { background: '#FDECEC', color: '#B42318', border: '1px solid #F5B5B0' }
    }
    return { background: '#FFF4E5', color: '#9A6A28', border: '1px solid #F3D19C' }
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
              style={{ color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.25)' }}
            >
              ← Admin Panele Dön
            </Link>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '2rem 1.5rem 3rem' }}>

        {/* Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
            maxWidth: 600,
          }}
        >
          {[
            { label: 'TOPLAM ÜYE', value: users.length },
            { label: 'ADMİN', value: users.filter((u) => u.role === 'admin').length },
            { label: 'MEMBER', value: users.filter((u) => u.role !== 'admin').length },
          ].map((card) => (
            <div key={card.label} className="card" style={{ padding: '1.25rem 1.5rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'var(--font-display)' }}>
                {card.value}
              </div>
              <div style={{ fontSize: '0.7rem', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                {card.label}
              </div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-primary"
            onClick={() => { setShowForm(!showForm); setErrorMessage(null); setSuccessMessage(null) }}
          >
            {showForm ? '✕ İptal' : '+ Yeni Kullanıcı'}
          </button>
        </div>

        {/* Messages */}
        {successMessage && (
          <div style={{ marginBottom: '1rem', background: '#EEF8F1', border: '1px solid #B7DEC2', color: '#216A3A', borderRadius: 12, padding: '0.875rem 1rem', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
            {successMessage}
            <button onClick={() => setSuccessMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#216A3A' }}>✕</button>
          </div>
        )}

        {errorMessage && (
          <div style={{ marginBottom: '1rem', background: '#FFF7F7', border: '1px solid #E5C7C7', color: '#A94442', borderRadius: 12, padding: '0.875rem 1rem', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
            {errorMessage}
            <button onClick={() => setErrorMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A94442' }}>✕</button>
          </div>
        )}

        {/* Create Form */}
        {showForm && (
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', maxWidth: 480 }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-primary)', fontFamily: 'var(--font-display)' }}>
              Yeni Kullanıcı Oluştur
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              Açık kayıt kapalıdır. Yeni hesaplar yalnızca admin tarafından eklenir.
            </p>
            <form onSubmit={handleCreateUser} style={{ display: 'grid', gap: '0.85rem' }}>
              <div>
                <label style={LS}>Ad Soyad</label>
                <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Kullanıcı adı" />
              </div>
              <div>
                <label style={LS}>E-posta</label>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@email.com" />
              </div>
              <div>
                <label style={LS}>Şifre</label>
                <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div>
                <label style={LS}>Rol</label>
                <select className="input" value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as NewUserRole)}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button className="btn btn-primary" type="submit" disabled={creatingUser}>
                {creatingUser ? 'Oluşturuluyor...' : 'Kullanıcı Oluştur'}
              </button>
            </form>
          </div>
        )}

        {/* Users List */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem', color: 'var(--color-text)' }}>
              Kayıtlı Kullanıcılar
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: '0.5rem' }}>
                ({filteredUsers.length})
              </span>
            </h2>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ad, e-posta veya role göre ara..."
              className="input"
              style={{ maxWidth: 300, width: '100%' }}
            />
          </div>

          {loading ? (
            <div style={{ color: 'var(--color-text-muted)', padding: '2rem', textAlign: 'center' }}>Yükleniyor...</div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ color: 'var(--color-text-muted)', padding: '2rem', textAlign: 'center' }}>Kullanıcı bulunamadı.</div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {filteredUsers.map((user) => {
                const roleStyle = getRoleStyle(user.role)
                const isDeleting = deletingId === user.id
                const isSaving = savingId === user.id

                return (
                  <div
                    key={user.id}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 12,
                      padding: '1rem',
                      background: 'white',
                      opacity: isDeleting ? 0.5 : 1,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.2rem' }}>
                          {user.full_name || 'İsimsiz kullanıcı'}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>
                          {user.email || '-'}
                        </div>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.2rem 0.6rem',
                            borderRadius: 999,
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            ...roleStyle,
                          }}
                        >
                          {user.role || 'member'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={isSaving || isDeleting}
                          onClick={() => updateRole(user.id, 'member')}
                        >
                          {isSaving ? '...' : 'Member Yap'}
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={isSaving || isDeleting}
                          onClick={() => updateRole(user.id, 'admin')}
                        >
                          {isSaving ? '...' : 'Admin Yap'}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={isSaving || isDeleting}
                          onClick={() => handleDeleteUser(user.id, user.full_name || user.email || 'Kullanıcı')}
                          style={{ color: '#A94442', border: '1px solid #E5C7C7' }}
                        >
                          {isDeleting ? 'Siliniyor...' : '🗑 Sil'}
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
