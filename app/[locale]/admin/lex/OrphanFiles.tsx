'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { fetchOrphanFiles, type OrphanFile } from '@/lib/lex'
import { ui } from './components'

// Admin: kovada kaydı olmayan dosyalar (yükleme yarıda kaldıysa veya madde/sayfa
// silindiyse kalanlar). Listeleme isteğe bağlı; silme tek tek veya hepsi.
export function OrphanFiles() {
  const [rows, setRows] = useState<OrphanFile[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmAll, setConfirmAll] = useState(false)

  async function load() {
    setBusy(true); setError('')
    const r = await fetchOrphanFiles()
    setBusy(false)
    if (r.error) setError(r.error)
    setRows(r.rows)
  }

  async function remove(files: OrphanFile[]) {
    setBusy(true); setError('')
    const sb = createClient()
    for (const b of Array.from(new Set(files.map((f) => f.bucket)))) {
      const { error: e } = await sb.storage.from(b).remove(files.filter((f) => f.bucket === b).map((f) => f.name))
      if (e) setError(e.message)
    }
    setConfirmAll(false)
    await load()
  }

  return (
    <section className="card" style={{ ...ui.card, marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <h2 style={{ ...ui.h2, margin: 0 }}>Sahipsiz dosyalar</h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>kaydı olmayan sayfa görseli, ses ve resim</span>
        <button className="btn btn-sm btn-secondary" style={{ marginLeft: 'auto' }} disabled={busy} onClick={load}>
          {rows === null ? 'Denetle' : 'Yenile'}
        </button>
        {rows && rows.length > 0 && (
          <button className="btn btn-sm btn-ghost" style={{ color: 'var(--color-danger)' }} disabled={busy}
            onClick={() => (confirmAll ? remove(rows) : setConfirmAll(true))} onBlur={() => setConfirmAll(false)}>
            {confirmAll ? `Emin misiniz? ${rows.length} dosya silinecek` : 'Hepsini sil'}
          </button>
        )}
      </div>
      {rows && rows.length === 0 && <p style={{ fontSize: '0.85rem', margin: '0.5rem 0 0' }}>Sahipsiz dosya yok.</p>}
      {rows && rows.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem' }}>
          <tbody>
            {rows.map((f) => (
              <tr key={f.bucket + f.name}>
                <td style={{ ...ui.td, fontSize: '0.8rem' }}>{f.bucket}</td>
                <td style={{ ...ui.td, fontSize: '0.8rem', fontFamily: 'monospace' }}>{f.name}</td>
                <td style={{ ...ui.td, fontSize: '0.8rem' }}>{new Date(f.created_at).toLocaleString('tr-TR')}</td>
                <td style={ui.td}>
                  <button className="btn btn-sm btn-ghost" style={{ color: 'var(--color-danger)' }} disabled={busy} onClick={() => remove([f])}>Sil</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {error && <p style={{ color: 'var(--color-danger)', marginBottom: 0 }}>{error}</p>}
    </section>
  )
}
