'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocale } from 'next-intl'
import {
  lexDb, explainError, myLexRole, flattenCategories, categoryDescendants, CATEGORY_CODE_RE,
  type Category,
} from '@/lib/lex'
import { LexNav, NoRole, Field, ui } from '../components'

type Row = Category & { sense_category: { count: number }[] }
const EMPTY = { code: '', name_tr: '', name_en: '', parent: '' }

function fetchCategories() {
  return lexDb().from('category').select('code,name_tr,name_en,parent,sense_category(count)')
}

function catError(e: { code?: string; message?: string }): string {
  if (e.code === '23505') return 'Bu kod zaten kullanılıyor.'
  if (e.code === '23503') return 'Bu kategori kullanımda (anlamlara atanmış veya alt kategorisi var); önce onları kaldırın.'
  return explainError(e)
}

export default function CategoryPage() {
  const locale = useLocale()
  const [role, setRole] = useState<string | null | undefined>(undefined)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [editing, setEditing] = useState<string | null>(null) // düzenlenen kod; null = yeni
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const apply = useCallback(({ data, error: e }: { data: unknown; error: { code?: string; message?: string } | null }) => {
    if (e) setError(catError(e))
    setRows((data as Row[] | null) ?? [])
  }, [])

  useEffect(() => {
    myLexRole().then(setRole)
    fetchCategories().then(apply)
  }, [apply])

  const reload = () => fetchCategories().then(apply)

  const tree = useMemo(() => flattenCategories(rows ?? []), [rows])
  const usage = useMemo(() => new Map((rows ?? []).map((r) => [r.code, r.sense_category?.[0]?.count ?? 0])), [rows])
  const childCount = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of rows ?? []) if (r.parent) m.set(r.parent, (m.get(r.parent) ?? 0) + 1)
    return m
  }, [rows])
  // Üst kategori seçenekleri: düzenlenen kategori ve altları hariç
  const parentOptions = useMemo(() => {
    if (!editing) return tree
    const banned = categoryDescendants(rows ?? [], editing)
    return tree.filter((c) => !banned.has(c.code))
  }, [tree, rows, editing])

  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }))

  function startEdit(c: Category) {
    setEditing(c.code); setError(''); setMsg('')
    setForm({ code: c.code, name_tr: c.name_tr, name_en: c.name_en, parent: c.parent ?? '' })
  }
  function startNew(parent = '') {
    setEditing(null); setError(''); setMsg('')
    setForm({ ...EMPTY, parent })
  }

  async function save() {
    setError(''); setMsg('')
    const code = form.code.trim()
    if (!editing && !CATEGORY_CODE_RE.test(code)) {
      setError('Kod küçük harf, rakam, - ve _ içerebilir (ör. aile, gunler-ve-aylar).'); return
    }
    if (!form.name_tr.trim() || !form.name_en.trim()) { setError('Türkçe ve İngilizce ad gerekli.'); return }
    setBusy(true)
    const row = { name_tr: form.name_tr.trim(), name_en: form.name_en.trim(), parent: form.parent || null }
    const db = lexDb().from('category')
    const { error: e } = editing
      ? await db.update(row).eq('code', editing)
      : await db.insert({ code, ...row })
    setBusy(false)
    if (e) { setError(catError(e)); return }
    setMsg(editing ? 'Güncellendi.' : 'Eklendi.')
    if (!editing) setForm({ ...EMPTY, parent: form.parent })
    reload()
  }

  async function remove(code: string) {
    if (confirmDel !== code) { setConfirmDel(code); return }
    setConfirmDel(null); setError(''); setMsg('')
    const { error: e, count } = await lexDb().from('category').delete({ count: 'exact' }).eq('code', code)
    if (e || !count) { setError(e ? catError(e) : 'Silinemedi (yetki yok).'); return }
    if (editing === code) startNew()
    setMsg('Silindi.')
    reload()
  }

  const canWrite = !!role

  return (
    <main className="container" style={{ padding: '1.5rem 0 3rem', maxWidth: 960 }}>
      <LexNav locale={locale} role={role ?? null} />
      {role === null && <NoRole />}
      <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem' }}>Kategoriler</h1>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: 0 }}>
        Konu kategorileri anlamlara atanır (madde ekranında, her anlamın altında). Kod sonradan değiştirilemez; adlar değiştirilebilir.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', alignItems: 'start' }}>
        <section className="card" style={{ padding: 0, overflowX: 'auto' }}>
          {rows === null ? <p style={{ padding: '1rem' }}>Yükleniyor…</p> : tree.length === 0 ? (
            <p style={{ padding: '1rem', margin: 0 }}>Henüz kategori yok.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr><th style={ui.th}>Kategori</th><th style={ui.th}>Kod</th><th style={ui.th}>Anlam</th><th style={ui.th}></th></tr>
              </thead>
              <tbody>
                {tree.map((c) => {
                  const used = (usage.get(c.code) ?? 0) + (childCount.get(c.code) ?? 0)
                  return (
                    <tr key={c.code} style={editing === c.code ? { background: 'var(--color-accent-light)' } : undefined}>
                      <td style={{ ...ui.td, paddingLeft: `${0.5 + c.depth * 1.25}rem` }}>
                        {c.depth > 0 && <span style={{ color: 'var(--color-text-subtle)' }}>└ </span>}
                        <strong>{c.name_tr}</strong>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}> · {c.name_en}</span>
                      </td>
                      <td style={{ ...ui.td, fontSize: '0.8rem' }}><code>{c.code}</code></td>
                      <td style={{ ...ui.td, fontSize: '0.85rem' }}>{usage.get(c.code) ?? 0}</td>
                      <td style={{ ...ui.td, whiteSpace: 'nowrap', textAlign: 'right' }}>
                        {canWrite && <button className="btn btn-sm btn-ghost" onClick={() => startEdit(c)}>Düzenle</button>}
                        {canWrite && <button className="btn btn-sm btn-ghost" onClick={() => startNew(c.code)}>+ Alt</button>}
                        {role === 'admin' && (
                          <button className="btn btn-sm btn-ghost" style={{ color: 'var(--color-danger)' }}
                            disabled={used > 0} title={used > 0 ? 'Kullanımda: anlam veya alt kategori var' : ''}
                            onClick={() => remove(c.code)} onBlur={() => setConfirmDel(null)}>
                            {confirmDel === c.code ? 'Emin misiniz?' : 'Sil'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>

        {canWrite && (
          <section className="card" style={ui.card}>
            <h2 style={ui.h2}>{editing ? 'Kategoriyi düzenle' : 'Yeni kategori'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <Field label="Kod (küçük harf, kalıcı)">
                <input className="input" value={form.code} disabled={!!editing} placeholder="ör. aile"
                  onChange={(e) => set('code', e.target.value.toLowerCase())} />
              </Field>
              <Field label="Ad (TR)">
                <input className="input" value={form.name_tr} onChange={(e) => set('name_tr', e.target.value)} />
              </Field>
              <Field label="Ad (EN)">
                <input className="input" value={form.name_en} onChange={(e) => set('name_en', e.target.value)} />
              </Field>
              <Field label="Üst kategori">
                <select className="input" value={form.parent} onChange={(e) => set('parent', e.target.value)}>
                  <option value="">— (en üst)</option>
                  {parentOptions.map((c) => <option key={c.code} value={c.code}>{c.path}</option>)}
                </select>
              </Field>
              {error && <p style={{ color: 'var(--color-danger)', margin: 0 }}>{error}</p>}
              {msg && <p style={{ color: 'var(--color-success)', margin: 0 }}>{msg}</p>}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
                {editing && <button className="btn btn-ghost" onClick={() => startNew()}>Vazgeç</button>}
              </div>
            </div>
          </section>
        )}
      </div>
      {!canWrite && error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}
    </main>
  )
}
