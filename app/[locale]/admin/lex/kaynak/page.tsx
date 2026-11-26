'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import {
  lexDb, myLexRole, sourceError, SIGLUM_RE, SOURCE_KIND_LABEL, LICENSE_LABEL,
  type SourceKind, type LicenseKind, type Status,
} from '@/lib/lex'
import { LexNav, NoRole, StatusBadge, Field, ui } from '../components'

type Row = {
  id: string; kind: SourceKind; siglum: string | null; title: string; author: string | null
  year_text: string | null; license: LicenseKind; status: Status
  page: { count: number }[]; dictionary_entry: { count: number }[]
}

function fetchSources() {
  return lexDb().from('source_work')
    .select('id,kind,siglum,title,author,year_text,license,status,page(count),dictionary_entry(count)')
    .order('siglum', { nullsFirst: false }).order('title')
}

export default function SourceListPage() {
  const locale = useLocale()
  const router = useRouter()
  const [role, setRole] = useState<string | null | undefined>(undefined)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [kind, setKind] = useState<'' | SourceKind>('')
  const [q, setQ] = useState('')
  const [form, setForm] = useState({ kind: 'dictionary' as SourceKind, siglum: '', title: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const apply = useCallback(({ data, error: e }: { data: unknown; error: { code?: string; message?: string } | null }) => {
    if (e) setError(sourceError(e))
    setRows((data as Row[] | null) ?? [])
  }, [])

  useEffect(() => {
    myLexRole().then(setRole)
    fetchSources().then(apply)
  }, [apply])

  const shown = useMemo(() => {
    const t = q.trim().toLocaleLowerCase('tr')
    return (rows ?? []).filter((r) => (!kind || r.kind === kind) &&
      (!t || [r.siglum, r.title, r.author].some((x) => x?.toLocaleLowerCase('tr').includes(t))))
  }, [rows, kind, q])

  async function create() {
    setError('')
    const siglum = form.siglum.trim()
    if (!form.title.trim()) { setError('Başlık gerekli.'); return }
    if (siglum && !SIGLUM_RE.test(siglum)) { setError('Kısa ad yalnız harf, rakam, nokta, - ve _ içerebilir (ör. PS, SFERMELE).'); return }
    setBusy(true)
    const { data, error: e } = await lexDb().from('source_work')
      .insert({ kind: form.kind, siglum: siglum || null, title: form.title.trim() }).select('id').single()
    setBusy(false)
    if (e) { setError(sourceError(e)); return }
    router.push(`/${locale}/admin/lex/kaynak/${data.id}`)
  }

  return (
    <main className="container" style={{ padding: '1.5rem 0 3rem' }}>
      <LexNav locale={locale} role={role ?? null} />
      {role === null && <NoRole />}
      <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem' }}>Kaynaklar</h1>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: 0 }}>
        Basılı sözlükler, dilbilgileri, el yazmaları ve metinler. Sayfa görselleri ve sözlük maddeleri eserin kendi ekranından girilir.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-start' }}>
        <section style={{ flex: '2 1 520px', minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <input className="input" style={{ flex: '1 1 240px' }} placeholder="Kısa ad, başlık veya yazar" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="input" style={{ width: 180 }} value={kind} onChange={(e) => setKind(e.target.value as SourceKind | '')}>
              <option value="">Tüm türler</option>
              {(Object.keys(SOURCE_KIND_LABEL) as SourceKind[]).map((k) => <option key={k} value={k}>{SOURCE_KIND_LABEL[k]}</option>)}
            </select>
          </div>
          <div className="card table-wrap" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr>
                  <th style={ui.th}>Kısa ad</th><th style={ui.th}>Eser</th><th style={ui.th}>Tür</th>
                  <th style={ui.th}>Lisans</th><th style={ui.th}>Sayfa</th><th style={ui.th}>Sözlük md.</th><th style={ui.th}>Durum</th>
                </tr>
              </thead>
              <tbody>
                {rows === null ? (
                  <tr><td style={ui.td} colSpan={7}>Yükleniyor…</td></tr>
                ) : shown.length === 0 ? (
                  <tr><td style={{ ...ui.td, color: 'var(--color-text-muted)' }} colSpan={7}>{rows.length ? 'Eşleşen eser yok.' : 'Henüz eser yok.'}</td></tr>
                ) : shown.map((r) => (
                  <tr key={r.id}>
                    <td style={ui.td}><code>{r.siglum ?? '—'}</code></td>
                    <td style={ui.td}>
                      <Link href={`/${locale}/admin/lex/kaynak/${r.id}`} style={{ fontWeight: 600 }}>{r.title}</Link>
                      {(r.author || r.year_text) && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{[r.author, r.year_text].filter(Boolean).join(', ')}</div>
                      )}
                    </td>
                    <td style={ui.td}>{SOURCE_KIND_LABEL[r.kind]}</td>
                    <td style={{ ...ui.td, fontSize: '0.82rem' }}>{LICENSE_LABEL[r.license]}</td>
                    <td style={ui.td}>{r.page?.[0]?.count ?? 0}</td>
                    <td style={ui.td}>{r.dictionary_entry?.[0]?.count ?? 0}</td>
                    <td style={ui.td}><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {role && (
          <section className="card" style={{ ...ui.card, flex: '1 1 280px' }}>
            <h2 style={ui.h2}>Yeni eser</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <Field label="Tür">
                <select className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as SourceKind })}>
                  {(Object.keys(SOURCE_KIND_LABEL) as SourceKind[]).map((k) => <option key={k} value={k}>{SOURCE_KIND_LABEL[k]}</option>)}
                </select>
              </Field>
              <Field label="Kısa ad (siglum, isteğe bağlı)">
                <input className="input" value={form.siglum} placeholder="ör. SFERMELE" onChange={(e) => setForm({ ...form, siglum: e.target.value })} />
              </Field>
              <Field label="Başlık">
                <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </Field>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0 }}>Diğer bilgiler (yazar, yıl, lisans…) sonraki ekranda.</p>
              {error && <p style={{ color: 'var(--color-danger)', margin: 0 }}>{error}</p>}
              <button className="btn btn-primary" onClick={create} disabled={busy}>{busy ? 'Oluşturuluyor…' : 'Oluştur'}</button>
            </div>
          </section>
        )}
      </div>
      {!role && error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}
    </main>
  )
}
