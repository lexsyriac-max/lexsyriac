'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import {
  lexDb, myLexRole, learningError, reorder, moved, UNIT_SELECT, UNIT_SLUG_RE,
  type UnitRow, type Status,
} from '@/lib/lex'
import { LexNav, NoRole, StatusBadge, Field, ui } from '../components'
import { StatusControl, MoveButtons, isEditor } from './shared'

type LessonLite = { id: string; seq: number; title_tr: string; status: Status; lesson_item: { count: number }[]; exercise: { count: number }[] }
type Unit = UnitRow & { lesson: LessonLite[] }

function fetchUnits() {
  return lexDb().from('unit')
    .select(UNIT_SELECT + ',lesson(id,seq,title_tr,status,lesson_item(count),exercise(count))')
    .order('seq').order('seq', { referencedTable: 'lesson' })
}

export default function LearningPage() {
  const locale = useLocale()
  const [role, setRole] = useState<string | null | undefined>(undefined)
  const [units, setUnits] = useState<Unit[] | null>(null)
  const [form, setForm] = useState({ slug: '', title_tr: '', level: 'A1' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const apply = useCallback(({ data, error: e }: { data: unknown; error: { code?: string; message?: string } | null }) => {
    if (e) setError(learningError(e))
    setUnits((data as Unit[] | null) ?? [])
  }, [])
  const reload = useCallback(() => fetchUnits().then(apply), [apply])

  useEffect(() => {
    myLexRole().then(setRole)
    fetchUnits().then(apply)
  }, [apply])

  async function run(p: PromiseLike<string>) {
    setBusy(true); setError('')
    const msg = await p
    if (msg) setError(msg)
    await reload()
    setBusy(false)
  }

  async function createUnit() {
    const slug = form.slug.trim().toLowerCase()
    if (!form.title_tr.trim()) { setError('Ünite adı gerekli.'); return }
    if (!UNIT_SLUG_RE.test(slug)) { setError('Kısa ad yalnız küçük harf, rakam ve tire içerebilir (ör. a1-giris).'); return }
    await run(lexDb().from('unit').insert({ slug, title_tr: form.title_tr.trim(), level: form.level.trim() || null })
      .then(({ error: e }) => {
        if (!e) setForm({ slug: '', title_tr: '', level: form.level })
        return learningError(e)
      }))
  }

  const editor = isEditor(role)

  return (
    <main className="container" style={{ padding: '1.5rem 0 3rem', maxWidth: 960 }}>
      <LexNav locale={locale} role={role ?? null} />
      {role === null && <NoRole />}
      <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem' }}>Üniteler ve dersler</h1>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: 0 }}>
        Ünite → ders → içerik → alıştırma. Ders içeriği kopyalanmaz, sözlükteki anlama, forma, örneğe veya çekim tablosuna işaret eder.
        Ziyaretçi bir dersi ancak ders ve ünitesi yayımlandığında görür; ders, gösterdiği her kayıt yayımlanmadan yayımlanamaz.
      </p>
      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}

      {units === null ? <p>Yükleniyor…</p> : units.length === 0 ? (
        <div className="card" style={ui.card}>Henüz ünite yok.</div>
      ) : units.map((u, i) => (
        <UnitCard key={u.id} unit={u} index={i} count={units.length} locale={locale}
          canWrite={!!role} canEdit={editor} busy={busy}
          onMove={(d) => run(reorder('unit', moved(units, i, d).map((x) => x.id)))}
          onRun={run} />
      ))}

      {role && (
        <section className="card" style={ui.card}>
          <h2 style={ui.h2}>Yeni ünite</h2>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '2 1 220px' }}>
              <Field label="Ad (TR)">
                <input className="input" value={form.title_tr} onChange={(e) => setForm({ ...form, title_tr: e.target.value })} />
              </Field>
            </div>
            <div style={{ flex: '1 1 160px' }}>
              <Field label="Kısa ad (adres için)">
                <input className="input" value={form.slug} placeholder="a1-giris" onChange={(e) => setForm({ ...form, slug: e.target.value })} />
              </Field>
            </div>
            <div style={{ width: 90 }}>
              <Field label="Düzey">
                <input className="input" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
              </Field>
            </div>
            <button className="btn btn-primary" onClick={createUnit} disabled={busy}>Ekle</button>
          </div>
        </section>
      )}
    </main>
  )
}

function UnitCard({ unit: u, index, count, locale, canWrite, canEdit, busy, onMove, onRun }: {
  unit: Unit; index: number; count: number; locale: string; canWrite: boolean; canEdit: boolean; busy: boolean
  onMove: (d: -1 | 1) => void; onRun: (p: PromiseLike<string>) => Promise<void>
}) {
  const [edit, setEdit] = useState(false)
  const [d, setD] = useState({ title_tr: u.title_tr, title_en: u.title_en ?? '', level: u.level ?? '', slug: u.slug, description: u.description ?? '', source_note: u.source_note ?? '' })
  const [newLesson, setNewLesson] = useState('')
  const locked = (u.status === 'reviewed' || u.status === 'published') && !canEdit

  function save() {
    const slug = d.slug.trim().toLowerCase()
    return onRun(lexDb().from('unit').update({
      title_tr: d.title_tr.trim(), title_en: d.title_en.trim() || null, level: d.level.trim() || null, slug,
      description: d.description.trim() || null, source_note: d.source_note.trim() || null,
    }).eq('id', u.id).then(({ error: e }) => { if (!e) setEdit(false); return learningError(e) }))
  }
  function addLesson() {
    if (!newLesson.trim()) return Promise.resolve()
    return onRun(lexDb().from('lesson').insert({ unit_id: u.id, title_tr: newLesson.trim() })
      .then(({ error: e }) => { if (!e) setNewLesson(''); return learningError(e) }))
  }

  return (
    <section className="card" style={ui.card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--color-text-subtle)', fontSize: '0.85rem' }}>{u.seq}.</span>
        <h2 style={{ ...ui.h2, margin: 0 }}>{u.title_tr}</h2>
        {u.level && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{u.level}</span>}
        <code style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>{u.slug}</code>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
          <StatusControl status={u.status} canEdit={canEdit} busy={busy}
            onChange={(s) => onRun(lexDb().from('unit').update({ status: s }).eq('id', u.id).then(({ error: e }) => learningError(e)))} />
          {canWrite && <MoveButtons index={index} count={count} disabled={busy || locked} onMove={onMove} />}
          {canWrite && !locked && <button className="btn btn-ghost btn-sm" onClick={() => setEdit(!edit)}>{edit ? 'Kapat' : 'Düzenle'}</button>}
        </span>
      </div>
      {u.description && !edit && <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0.4rem 0 0' }}>{u.description}</p>}

      {edit && (
        <div style={{ ...ui.grid, marginTop: '0.75rem' }}>
          <Field label="Ad (TR)"><input className="input" value={d.title_tr} onChange={(e) => setD({ ...d, title_tr: e.target.value })} /></Field>
          <Field label="Ad (EN)"><input className="input" value={d.title_en} onChange={(e) => setD({ ...d, title_en: e.target.value })} /></Field>
          <Field label="Düzey"><input className="input" value={d.level} onChange={(e) => setD({ ...d, level: e.target.value })} /></Field>
          <Field label="Kısa ad"><input className="input" value={d.slug} onChange={(e) => setD({ ...d, slug: e.target.value })} /></Field>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Açıklama"><textarea className="input" rows={2} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} /></Field>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Kaynak / telif notu"><input className="input" value={d.source_note} onChange={(e) => setD({ ...d, source_note: e.target.value })} /></Field>
          </div>
          <div><button className="btn btn-primary btn-sm" onClick={save} disabled={busy}>Kaydet</button></div>
        </div>
      )}

      <div style={{ marginTop: '0.75rem' }}>
        {u.lesson.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>Bu ünitede ders yok.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <tbody>
              {u.lesson.map((l, j) => (
                <tr key={l.id}>
                  <td style={{ ...ui.td, width: 36, color: 'var(--color-text-subtle)' }}>{l.seq}</td>
                  <td style={ui.td}><Link href={`/${locale}/admin/lex/ogren/ders/${l.id}`} style={{ fontWeight: 600 }}>{l.title_tr}</Link></td>
                  <td style={{ ...ui.td, fontSize: '0.78rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                    {l.lesson_item?.[0]?.count ?? 0} içerik · {l.exercise?.[0]?.count ?? 0} alıştırma
                  </td>
                  <td style={ui.td}><StatusBadge status={l.status} /></td>
                  <td style={{ ...ui.td, width: 80 }}>
                    {canWrite && <MoveButtons index={j} count={u.lesson.length} disabled={busy}
                      onMove={(dd) => onRun(reorder('lesson', moved(u.lesson, j, dd).map((x) => x.id)))} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {canWrite && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
            <input className="input" style={{ flex: 1 }} placeholder="Yeni ders adı" value={newLesson}
              onChange={(e) => setNewLesson(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addLesson() }} />
            <button className="btn btn-secondary btn-sm" onClick={addLesson} disabled={busy || !newLesson.trim()}>+ Ders</button>
          </div>
        )}
      </div>
    </section>
  )
}
