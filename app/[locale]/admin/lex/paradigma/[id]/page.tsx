'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import {
  lexDb, explainError, myLexRole, syrSkeleton, applyPattern, patternProblem,
  cellKey, cellLabel, skeletonRows, POS_LABEL, VERB_FORM_LABEL,
  PARADIGM_CLASS_SELECT,
  type CellKey, type ParadigmCell, type ParadigmClass, type Status,
} from '@/lib/lex'
import { LexNav, StatusBadge, Syr, NoRole, Field, ui } from '../../components'

type CellDraft = CellKey & {
  key: string
  id?: string
  west: string
  east: string
  skeleton: string // boşsa harekeliden otomatik
  notes: string
}

const EMPTY = {
  code: '', label: '', pos: 'verb', stem_code: 'peal', radical_count: 3,
  description: '', source_note: '',
}

const isEmptyCell = (c: CellDraft) => !c.west.trim() && !c.east.trim() && !c.skeleton.trim()

function buildRows(pos: string, cells: ParadigmCell[]): CellDraft[] {
  const byKey = new Map(cells.map((c) => [cellKey(c), c]))
  const toDraft = (k: CellKey, c?: ParadigmCell): CellDraft => ({
    ...k, key: cellKey(k), id: c?.id,
    west: c?.pattern_west ?? '', east: c?.pattern_east ?? '',
    // iskelet yalnız harekeli kalıp yoksa ayrıca gösterilir
    skeleton: c && !c.pattern_west && !c.pattern_east ? c.pattern_skeleton : '',
    notes: c?.notes ?? '',
  })
  const rows = skeletonRows(pos).map((k) => toDraft(k, byKey.get(cellKey(k))))
  const known = new Set(rows.map((r) => r.key))
  for (const c of cells) if (!known.has(cellKey(c))) rows.push(toDraft(c, c))
  return rows
}

export default function ParadigmEditPage() {
  const locale = useLocale()
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'yeni'

  const [role, setRole] = useState<string | null | undefined>(undefined)
  const [form, setForm] = useState(EMPTY)
  const [status, setStatus] = useState<Status>('draft')
  const [rows, setRows] = useState<CellDraft[]>(() => buildRows(EMPTY.pos, []))
  const [testRoot, setTestRoot] = useState('ܟܬܒ')
  const [stems, setStems] = useState<{ code: string; name: string }[]>([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isEditor = role === 'editor' || role === 'admin'
  const locked = !isNew && !isEditor && (status === 'reviewed' || status === 'published')

  useEffect(() => {
    myLexRole().then(setRole)
    lexDb().from('verb_stem').select('code,name').order('seq').then(({ data }) => setStems(data ?? []))
  }, [])

  useEffect(() => {
    if (isNew) return
    const db = lexDb()
    Promise.all([
      db.from('paradigm_class').select(PARADIGM_CLASS_SELECT).eq('id', id).maybeSingle(),
      db.from('paradigm_cell').select('*').eq('paradigm_class_id', id),
    ]).then(([c, cells]) => {
      setLoading(false)
      const e = c.error ?? cells.error
      if (e) { setError(explainError(e)); return }
      if (!c.data) { setError('Çekim sınıfı bulunamadı.'); return }
      const r = c.data as ParadigmClass
      setForm({
        code: r.code, label: r.label ?? '', pos: r.pos, stem_code: r.stem_code ?? '',
        radical_count: r.radical_count, description: r.description ?? '', source_note: r.source_note ?? '',
      })
      setStatus(r.status)
      setRows(buildRows(r.pos, (cells.data ?? []) as ParadigmCell[]))
    })
  }, [id, isNew])

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setForm((f) => ({ ...f, [k]: v }))
  const setRow = (key: string, patch: Partial<CellDraft>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  function changePos(pos: string) {
    set('pos', pos)
    if (pos !== 'verb') set('stem_code', '')
    // dolu hücreler korunur, boş satırlar yeni türün iskeletine göre kurulur
    setRows((rs) => {
      const filled = rs.filter((r) => !isEmptyCell(r) || r.id)
      const next = skeletonRows(pos).map((k): CellDraft => {
        const old = filled.find((r) => r.key === cellKey(k))
        return old ?? { ...k, key: cellKey(k), west: '', east: '', skeleton: '', notes: '' }
      })
      const known = new Set(next.map((r) => r.key))
      return [...next, ...filled.filter((r) => !known.has(r.key))]
    })
  }

  // Satır denetimi: veritabanındaki CHECK kurallarının önizlemesi
  const checked = useMemo(() => rows.map((r) => {
    const w = syrSkeleton(r.west), e = syrSkeleton(r.east), s = syrSkeleton(r.skeleton)
    const skel = s || w || e
    let problem = ''
    if ((w && e && w !== e) || (s && w && s !== w) || (s && e && s !== e)) problem = 'Batı / Doğu / iskelet uyuşmuyor'
    else if (skel) problem = patternProblem(skel)
    if (!problem && skel) {
      const max = Math.max(0, ...Array.from(skel.matchAll(/C([1-4])/g)).map((m) => Number(m[1])))
      if (max > form.radical_count) problem = `C${max} kullanılmış, sınıf ${form.radical_count} harfli kök bekliyor`
    }
    const radicalsOk = Array.from(syrSkeleton(testRoot)).length === form.radical_count
    const preview = radicalsOk ? applyPattern(r.west || r.east || skel, testRoot) : null
    return { row: r, skel, problem, preview }
  }), [rows, testRoot, form.radical_count])

  const problems = checked.filter((c) => c.problem).length
  const filledCount = checked.filter((c) => c.skel).length
  const testRootBad = !!testRoot && Array.from(syrSkeleton(testRoot)).length !== form.radical_count

  async function save() {
    setError(''); setMsg('')
    if (!/^[A-Z0-9_]+$/.test(form.code)) { setError('Kod yalnız BÜYÜK harf, rakam ve _ içerebilir (ör. VERB_PEAL_STRONG).'); return }
    if (problems) { setError(`${problems} satırda kalıp hatası var.`); return }
    setSaving(true)
    try {
      const db = lexDb()
      const cls = {
        code: form.code, label: form.label.trim() || null, pos: form.pos,
        stem_code: form.pos === 'verb' ? form.stem_code || null : null,
        radical_count: form.radical_count, description: form.description.trim() || null,
        source_note: form.source_note.trim() || null,
      }
      let classId = id
      if (isNew) {
        const { data, error: e } = await db.from('paradigm_class').insert(cls).select('id').single()
        if (e) throw e
        classId = data.id
      } else {
        const { error: e, count } = await db.from('paradigm_class').update(cls, { count: 'exact' }).eq('id', id)
        if (e) throw e
        if (!count) throw { code: '42501', message: 'sınıf güncellenemedi.' }
      }

      // Hücreler tek istekte (upsert); boşaltılan kayıtlı hücreler silinir
      const keep = checked.filter((c) => c.skel)
      const upserts = keep.map(({ row: r }) => ({
        id: r.id ?? crypto.randomUUID(),
        paradigm_class_id: classId,
        verb_form: r.verb_form, person: r.person, number: r.number, gender: r.gender, state: r.state,
        pattern_skeleton: r.west.trim() || r.east.trim() ? '' : syrSkeleton(r.skeleton),
        pattern_west: r.west.trim() || null,
        pattern_east: r.east.trim() || null,
        notes: r.notes.trim() || null,
      }))
      if (upserts.length) {
        const { error: e } = await db.from('paradigm_cell').upsert(upserts, { onConflict: 'id' })
        if (e) throw e
      }
      const drop = rows.filter((r) => r.id && isEmptyCell(r)).map((r) => r.id!)
      if (drop.length) {
        const { error: e } = await db.from('paradigm_cell').delete().in('id', drop)
        if (e) throw e
      }
      if (isNew) { router.replace(`/${locale}/admin/lex/paradigma/${classId}`); return }

      const { data: cells } = await db.from('paradigm_cell').select('*').eq('paradigm_class_id', classId)
      setRows(buildRows(form.pos, (cells ?? []) as ParadigmCell[]))
      setMsg(`Kaydedildi (${upserts.length} kalıp).`)
    } catch (e) {
      const err = e as { code?: string; message?: string }
      setError(err.code === '23505' ? 'Bu kod başka bir sınıfta kullanılıyor.' : explainError(err))
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(s: Status) {
    setError(''); setMsg('')
    const { error: e, count } = await lexDb().from('paradigm_class').update({ status: s }, { count: 'exact' }).eq('id', id)
    if (e || !count) setError(e ? explainError(e) : 'Durum değiştirilemedi.')
    else { setStatus(s); setMsg('Durum güncellendi.') }
  }

  async function remove() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    const { error: e, count } = await lexDb().from('paradigm_class').delete({ count: 'exact' }).eq('id', id)
    if (e || !count) {
      setError(e?.code === '23503' ? 'Bu sınıfa bağlı maddeler var; önce maddelerden sınıfı kaldırın.' : e ? explainError(e) : 'Silinemedi (yetki yok).')
      return
    }
    router.replace(`/${locale}/admin/lex/paradigma`)
  }

  // Satırları çekim türüne göre grupla
  const groups = useMemo(() => {
    const out: { title: string; items: typeof checked }[] = []
    for (const c of checked) {
      const title = c.row.verb_form ? VERB_FORM_LABEL[c.row.verb_form] : 'İsim çekimi'
      const g = out.find((x) => x.title === title)
      if (g) g.items.push(c)
      else out.push({ title, items: [c] })
    }
    return out
  }, [checked])

  return (
    <main className="container" style={{ padding: '1.5rem 0 3rem', maxWidth: 1100 }}>
      <LexNav locale={locale} role={role ?? null} />
      {role === null && <NoRole />}
      {loading ? <p>Yükleniyor…</p> : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{isNew ? 'Yeni çekim sınıfı' : form.code}</h1>
            {!isNew && <StatusBadge status={status} />}
          </div>
          {locked && (
            <p className="card" style={{ padding: '0.75rem 1rem', background: 'var(--color-accent-light)' }}>
              Bu sınıf {status === 'published' ? 'yayımlanmış' : 'incelenmiş'}; kalıplarını yalnız editör değiştirebilir.
            </p>
          )}

          <section className="card" style={ui.card}>
            <h2 style={ui.h2}>Sınıf</h2>
            <div style={ui.grid}>
              <Field label="Kod (ör. VERB_PEAL_STRONG)">
                <input className="input" value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase().replace(/\s+/g, '_'))} />
              </Field>
              <Field label="Ad">
                <input className="input" value={form.label} onChange={(e) => set('label', e.target.value)} />
              </Field>
              <Field label="Tür">
                <select className="input" value={form.pos} onChange={(e) => changePos(e.target.value)}>
                  {Object.entries(POS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              {form.pos === 'verb' && (
                <Field label="Fiil kalıbı">
                  <select className="input" value={form.stem_code} onChange={(e) => set('stem_code', e.target.value)}>
                    <option value="">— (hepsi)</option>
                    {stems.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Kök harf sayısı">
                <select className="input" value={form.radical_count} onChange={(e) => set('radical_count', Number(e.target.value))}>
                  {[2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ ...ui.grid, marginTop: '0.75rem' }}>
              <Field label="Açıklama">
                <textarea className="input" rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
              </Field>
              <Field label="Kaynak (gramer, sayfa)">
                <textarea className="input" rows={2} value={form.source_note} onChange={(e) => set('source_note', e.target.value)} />
              </Field>
            </div>
          </section>

          <section className="card" style={ui.card}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              <h2 style={{ ...ui.h2, margin: 0 }}>Kalıplar <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>{filledCount} dolu</span></h2>
              <div style={{ marginLeft: 'auto', width: 220 }}>
                <Field label="Deneme kökü (önizleme)">
                  <input className="input" dir="rtl" lang="syr" style={{ ...ui.syrInput, minHeight: 36, fontSize: '1.1rem', borderColor: testRootBad ? 'var(--color-danger)' : undefined }}
                    value={testRoot} onChange={(e) => setTestRoot(e.target.value)} />
                </Field>
              </div>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 0 }}>
              Harekeli kalıbı yazın; iskelet otomatik çıkar. Ör. Batı: <Syr size="1.05rem">C1C2ܰC3</Syr>. Boş bırakılan satır kaydedilmez; kayıtlı bir satırı boşaltmak onu siler.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={ui.th}>Hücre</th><th style={ui.th}>Batı kalıbı</th><th style={ui.th}>Doğu kalıbı</th>
                    <th style={ui.th}>İskelet</th><th style={ui.th}>Önizleme</th><th style={ui.th}>Not</th>
                  </tr>
                </thead>
                {groups.map((g) => (
                  <tbody key={g.title}>
                    <tr><td colSpan={6} style={{ ...ui.td, fontWeight: 600, background: 'var(--color-bg-subtle)' }}>{g.title}</td></tr>
                    {g.items.map(({ row: r, skel, problem, preview }) => (
                      <tr key={r.key}>
                        <td style={{ ...ui.td, whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{cellLabel({ ...r, verb_form: null })}</td>
                        <td style={ui.td}>
                          <input className="input" dir="rtl" lang="syr" style={cellInput} disabled={locked}
                            value={r.west} onChange={(e) => setRow(r.key, { west: e.target.value })} />
                        </td>
                        <td style={ui.td}>
                          <input className="input" dir="rtl" lang="syr" style={cellInput} disabled={locked}
                            value={r.east} onChange={(e) => setRow(r.key, { east: e.target.value })} />
                        </td>
                        <td style={ui.td}>
                          {r.west.trim() || r.east.trim() ? (
                            <span dir="rtl" style={{ color: 'var(--color-text-muted)' }}>{skel}</span>
                          ) : (
                            <input className="input" dir="rtl" lang="syr" style={cellInput} disabled={locked} placeholder="yalnız iskelet"
                              value={r.skeleton} onChange={(e) => setRow(r.key, { skeleton: e.target.value })} />
                          )}
                          {problem && <div style={{ color: 'var(--color-danger)', fontSize: '0.72rem' }}>{problem}</div>}
                        </td>
                        <td style={ui.td}>{preview ? <Syr size="1.2rem">{preview}</Syr> : <span style={{ color: 'var(--color-text-subtle)' }}>—</span>}</td>
                        <td style={ui.td}>
                          <input className="input" style={{ minWidth: 120 }} disabled={locked}
                            value={r.notes} onChange={(e) => setRow(r.key, { notes: e.target.value })} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
          </section>

          {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}
          {msg && <p style={{ color: 'var(--color-success)' }}>{msg}</p>}

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={save} disabled={saving || locked || !role}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
            {!isNew && isEditor && (
              <>
                <span style={{ color: 'var(--color-text-subtle)', margin: '0 0.25rem' }}>|</span>
                {status !== 'reviewed' && <button className="btn btn-secondary" onClick={() => changeStatus('reviewed')}>İncelendi</button>}
                {status !== 'published' && <button className="btn btn-accent" onClick={() => changeStatus('published')}>Yayımla</button>}
                {status !== 'draft' && <button className="btn btn-ghost" onClick={() => changeStatus('draft')}>Taslağa al</button>}
              </>
            )}
            {!isNew && role === 'admin' && (
              <button className="btn btn-ghost" style={{ marginLeft: 'auto', color: 'var(--color-danger)' }} onClick={remove} onBlur={() => setConfirmDelete(false)}>
                {confirmDelete ? 'Emin misiniz? Silmek için tekrar tıklayın' : 'Sınıfı sil'}
              </button>
            )}
          </div>
        </>
      )}
    </main>
  )
}

const cellInput: React.CSSProperties = { fontSize: '1.1rem', textAlign: 'right', minHeight: 34, minWidth: 110 }
