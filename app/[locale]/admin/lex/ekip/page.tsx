'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { myLexRole } from '@/lib/lex'
import { LexNav, NoRole, Field, ui } from '../components'

type Member = { user_id: string; email: string; role: string; granted_at: string; granted_by: string | null }
type TeamData = { me: string; members: Member[] }

const ROLE_LABEL: Record<string, string> = {
  contributor: 'Veri girişçi (taslak ekler)',
  editor: 'Editör (inceler, yayımlar)',
  admin: 'Admin (siler, ekip yönetir)',
}

function fetchTeam(): Promise<TeamData | { error: string }> {
  return fetch('/api/lex/team').then((r) => r.json())
}

export default function LexTeamPage() {
  const locale = useLocale()
  const [role, setRole] = useState<string | null | undefined>(undefined)
  const [team, setTeam] = useState<TeamData | null>(null)
  const [email, setEmail] = useState('')
  const [newRole, setNewRole] = useState('contributor')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const apply = useCallback((d: TeamData | { error: string }) => {
    if ('error' in d) { setError(d.error); return }
    setTeam(d)
  }, [])

  useEffect(() => {
    myLexRole().then((r) => {
      setRole(r)
      if (r === 'admin') fetchTeam().then(apply)
    })
  }, [apply])

  async function save(mail: string, r: string | null) {
    setBusy(true); setError(''); setMsg('')
    const res = await fetch('/api/lex/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: mail, role: r }),
    }).then((x) => x.json()).catch(() => ({ error: 'Bağlantı hatası' }))
    if (res.error) setError(res.error)
    else {
      setMsg(r ? `${mail}: ${r}` : `${mail}: rol kaldırıldı`)
      if (mail === email) setEmail('')
      fetchTeam().then(apply)
    }
    setBusy(false)
  }

  return (
    <main className="container" style={{ padding: '1.5rem 0 3rem', maxWidth: 960 }}>
      <LexNav locale={locale} role={role ?? null} />
      {role === null && <NoRole />}
      {role && role !== 'admin' && (
        <div className="card" style={ui.card}>Ekip yönetimi yalnız lex admin içindir.</div>
      )}
      {role === 'admin' && (
        <>
          <h1 style={{ margin: '0 0 0.75rem', fontSize: '1.5rem' }}>Ekip</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: 0 }}>
            Rol, var olan bir hesaba verilir. Hesap yoksa önce demo panelin Kullanıcılar ekranından açın.
            Rolü olan hesap girişte doğrudan bu bölüme gelir ve sitenin diğer admin sayfalarını görmez.
          </p>

          <div className="card" style={ui.card}>
            <h2 style={ui.h2}>Rol ver</h2>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 260px' }}>
                <Field label="E-posta">
                  <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </Field>
              </div>
              <Field label="Rol">
                <select className="input" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                  {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <button className="btn btn-primary" disabled={busy || !email.trim()} onClick={() => save(email.trim(), newRole)}>
                Ver
              </button>
            </div>
          </div>

          {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}
          {msg && <p style={{ color: 'var(--color-success, #0F6E56)' }}>{msg}</p>}

          {team === null ? <p>Yükleniyor…</p> : (
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={ui.th}>E-posta</th><th style={ui.th}>Rol</th>
                    <th style={ui.th}>Veren</th><th style={ui.th}>Tarih</th><th style={ui.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {team.members.map((m) => {
                    const self = m.user_id === team.me
                    return (
                      <tr key={m.user_id}>
                        <td style={ui.td}>{m.email}{self && <span style={{ color: 'var(--color-text-muted)' }}> (siz)</span>}</td>
                        <td style={ui.td}>
                          <select className="input" value={m.role} disabled={busy || self}
                            onChange={(e) => save(m.email, e.target.value)}>
                            {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </td>
                        <td style={ui.td}>{m.granted_by ?? '—'}</td>
                        <td style={ui.td}>{new Date(m.granted_at).toLocaleDateString('tr-TR')}</td>
                        <td style={ui.td}>
                          {!self && (
                            <button className="btn btn-sm btn-ghost" style={{ color: 'var(--color-danger)' }} disabled={busy}
                              onClick={() => save(m.email, null)}>
                              Rolü kaldır
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  )
}
