'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import {
  lexDb, explainError, myLexRole, syrSkeleton, cellLabel,
  MATCH_LABEL, VERB_FORM_LABEL, STATE_LABEL, STATUS_LABEL,
  type PreviewRow, type Status, type VerbForm, type Person, type GramNumber, type Gender, type GramState,
} from '@/lib/lex'
import { LexNav, StatusBadge, Syr, NoRole, MatchBadge, Field, ui } from '../../../components'
import { MediaPanel } from '../../../Media'

type Lexeme = {
  id: string
  lemma_west: string | null
  lemma_east: string | null
  lemma_skeleton: string
  pos: string
  stem_code: string | null
  root: { radicals: string } | null
  paradigm_class: { id: string; code: string; label: string | null; status: Status } | null
}
type FormRow = {
  id: string
  form_skeleton: string
  form_west: string | null
  form_east: string | null
  verb_form: VerbForm | null
  person: Person | null
  number: GramNumber | null
  gender: Gender | null
  state: GramState | null
  suffix_person: Person | null
  suffix_number: GramNumber | null
  suffix_gender: Gender | null
  proclitics: string | null
  is_generated: boolean
  status: Status
}
type Edit = { west: string; east: string }

const NEW_FORM = {
  west: '', east: '', verb_form: '', person: '', number: '', gender: '', state: '',
  suffix_person: '', suffix_number: '', suffix_gender: '', proclitics: '',
}

function fetchAll(id: string) {
  const db = lexDb()
  return Promise.all([
    db.from('lexeme')
      .select('id,lemma_west,lemma_east,lemma_skeleton,pos,stem_code,root:root_id(radicals),paradigm_class:paradigm_class_id(id,code,label,status)')
      .eq('id', id).maybeSingle(),
    db.rpc('preview_forms', { p_lexeme_id: id }),
    db.from('word_form').select('*').eq('lexeme_id', id)
      .or('suffix_person.not.is.null,suffix_number.not.is.null,suffix_gender.not.is.null,proclitics.not.is.null'),
  ])
}

export default function LexemeFormsPage() {
  const locale = useLocale()
  const { id } = useParams<{ id: string }>()

  const [role, setRole] = useState<string | null | undefined>(undefined)
  const [lex, setLex] = useState<Lexeme | null>(null)
  const [preview, setPreview] = useState<PreviewRow[] | null>(null)
  const [previewError, setPreviewError] = useState('')
  const [affixed, setAffixed] = useState<FormRow[]>([])
  const [edits, setEdits] = useState<Record<string, Edit>>({})
  const [nf, setNf] = useState(NEW_FORM)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [mediaOpen, setMediaOpen] = useState<string | null>(null)
  const [mediaCount, setMediaCount] = useState<Record<string, number>>({})

  const isEditor = role === 'editor' || role === 'admin'

  const apply = useCallback((d: Awaited<ReturnType<typeof fetchAll>>) => {
    const [l, p, f] = d
    if (l.error) setError(explainError(l.error))
    else if (!l.data) setError('Madde bulunamadı.')
    setLex((l.data as unknown as Lexeme) ?? null)
    if (p.error) { setPreview([]); setPreviewError(explainError(p.error)) }
    else { setPreview((p.data ?? []) as PreviewRow[]); setPreviewError('') }
    setAffixed((f.data ?? []) as FormRow[])
    setEdits({})
  }, [])
  const load = useCallback(() => fetchAll(id).then(apply), [id, apply])

  useEffect(() => {
    myLexRole().then(setRole)
    fetchAll(id).then(apply)
  }, [id, apply])

  async function run(label: string, fn: () => PromiseLike<{ error: { code?: string; message?: string } | null }>) {
    setBusy(true); setError(''); setMsg('')
    const { error: e } = await fn()
    setBusy(false)
    if (e) { setError(explainError(e)); return }
    setMsg(label)
    await load()
  }

  async function generate() {
    setBusy(true); setError(''); setMsg('')
    const { data, error: e } = await lexDb().rpc('generate_word_forms', { p_lexeme_id: id })
    setBusy(false)
    if (e) { setError(explainError(e)); return }
    setMsg(`${data ?? 0} form taslak olarak eklendi.`)
    await load()
  }

  // Elle düzeltilen form artık motorun ürünü sayılmaz
  const saveEdit = (formId: string) => {
    const ed = edits[formId]
    const w = ed.west.trim(), e = ed.east.trim()
    if (!w && !e) { setError('Batı veya Doğu yazımından biri gerekli.'); return }
    if (w && e && syrSkeleton(w) !== syrSkeleton(e)) { setError('Batı ve Doğu yazımının iskeleti farklı.'); return }
    run('Form düzeltildi.', () => lexDb().from('word_form')
      .update({ form_west: w || null, form_east: e || null, form_skeleton: '', is_generated: false }).eq('id', formId))
  }

  const takeEngine = (r: PreviewRow) =>
    run('Motorun formu alındı.', () => lexDb().from('word_form')
      .update({ form_west: r.gen_west, form_east: r.gen_east, form_skeleton: r.gen_skeleton ?? '', is_generated: true })
      .eq('id', r.form_id!))

  const deleteForm = (formId: string) =>
    run('Form silindi.', () => lexDb().from('word_form').delete().eq('id', formId))

  const bulkStatus = (s: Status) =>
    run(`Bütün formlar: ${STATUS_LABEL[s]}.`, () => lexDb().from('word_form')
      .update({ status: s }).eq('lexeme_id', id).neq('status', s))

  function addForm() {
    const w = nf.west.trim(), e = nf.east.trim()
    if (!w && !e) { setError('Batı veya Doğu yazımından biri gerekli.'); return }
    if (w && e && syrSkeleton(w) !== syrSkeleton(e)) { setError('Batı ve Doğu yazımının iskeleti farklı.'); return }
    const v = (x: string) => x || null
    run('Form eklendi.', async () => {
      const r = await lexDb().from('word_form').insert({
        lexeme_id: id, form_skeleton: '', form_west: w || null, form_east: e || null,
        verb_form: v(nf.verb_form), stem_code: lex?.pos === 'verb' ? lex?.stem_code ?? null : null,
        person: v(nf.person), number: v(nf.number), gender: v(nf.gender), state: v(nf.state),
        suffix_person: v(nf.suffix_person), suffix_number: v(nf.suffix_number), suffix_gender: v(nf.suffix_gender),
        proclitics: nf.proclitics.trim() || null,
      })
      if (!r.error) setNf(NEW_FORM)
      return r
    })
  }

  const counts = (preview ?? []).reduce<Record<string, number>>((a, r) => ({ ...a, [r.match]: (a[r.match] ?? 0) + 1 }), {})
  const formCount = (preview ?? []).filter((r) => r.form_id).length + affixed.length
  const formIdsKey = [...(preview ?? []).map((r) => r.form_id), ...affixed.map((f) => f.id)].filter(Boolean).join(',')
  const applyCounts = useCallback(({ data }: { data: { word_form_id: string | null }[] | null }) => {
    const c: Record<string, number> = {}
    for (const m of data ?? []) if (m.word_form_id) c[m.word_form_id] = (c[m.word_form_id] ?? 0) + 1
    setMediaCount(c)
  }, [])
  useEffect(() => {
    if (!formIdsKey) return
    lexDb().from('media').select('word_form_id').in('word_form_id', formIdsKey.split(',')).then(applyCounts)
  }, [formIdsKey, mediaOpen, applyCounts])
  const mediaBtn = (fid: string) => (
    <button className="btn btn-sm btn-ghost" title="Ses / görsel" onClick={() => setMediaOpen((x) => (x === fid ? null : fid))}>
      {'\u{1F50A}'}{mediaCount[fid] ? ` ${mediaCount[fid]}` : ''}
    </button>
  )
  const isVerb = lex?.pos === 'verb'

  return (
    <main className="container" style={{ padding: '1.5rem 0 3rem', maxWidth: 1100 }}>
      <LexNav locale={locale} role={role ?? null} />
      {role === null && <NoRole />}
      {!lex ? <p>{error || 'Yükleniyor…'}</p> : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            <Link href={`/${locale}/admin/lex/madde/${id}`} className="btn btn-sm btn-ghost">← Madde</Link>
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Çekimli formlar</h1>
            <Syr size="1.8rem">{lex.lemma_west || lex.lemma_east || lex.lemma_skeleton}</Syr>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: 0 }}>
            Kök: <Syr size="1.05rem">{lex.root?.radicals ?? '—'}</Syr> · Çekim sınıfı:{' '}
            {lex.paradigm_class ? (
              <Link href={`/${locale}/admin/lex/paradigma/${lex.paradigm_class.id}`}>
                <code>{lex.paradigm_class.code}</code>
              </Link>
            ) : 'atanmamış'}
            {lex.paradigm_class && lex.paradigm_class.status !== 'published' && <> ({STATUS_LABEL[lex.paradigm_class.status]})</>}
          </p>

          {previewError && (
            <div className="card" style={{ ...ui.card, borderColor: 'var(--color-danger)' }}>
              Motor çalışmadı: {previewError}{' '}
              <Link href={`/${locale}/admin/lex/madde/${id}`}>Maddeyi düzenle</Link>
            </div>
          )}

          {preview && preview.length > 0 && (
            <section className="card" style={ui.card}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                <h2 style={{ ...ui.h2, margin: 0 }}>Motor ↔ saklanan</h2>
                {Object.entries(counts).map(([k, n]) => {
                  const m = MATCH_LABEL[k as keyof typeof MATCH_LABEL]
                  return <MatchBadge key={k} {...m} text={`${m.text}: ${n}`} />
                })}
                {!!counts.missing && role && (
                  <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} disabled={busy} onClick={generate}>
                    Eksik {counts.missing} formu üret
                  </button>
                )}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={ui.th}>Hücre</th><th style={ui.th}>Motor</th><th style={ui.th}>Saklanan (Batı)</th>
                      <th style={ui.th}>Saklanan (Doğu)</th><th style={ui.th}>Sonuç</th><th style={ui.th}>Durum</th><th style={ui.th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => {
                      const ed = r.form_id ? edits[r.form_id] : undefined
                      return (
                        <Fragment key={r.form_id ?? r.cell_id ?? i}>
                        <tr>
                          <td style={{ ...ui.td, whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{cellLabel(r)}</td>
                          <td style={ui.td}><Syr size="1.2rem">{r.gen_west || r.gen_east || r.gen_skeleton || '—'}</Syr></td>
                          {ed ? (
                            <>
                              <td style={ui.td}><input className="input" dir="rtl" lang="syr" style={cellInput} value={ed.west}
                                onChange={(e) => setEdits((x) => ({ ...x, [r.form_id!]: { ...ed, west: e.target.value } }))} /></td>
                              <td style={ui.td}><input className="input" dir="rtl" lang="syr" style={cellInput} value={ed.east}
                                onChange={(e) => setEdits((x) => ({ ...x, [r.form_id!]: { ...ed, east: e.target.value } }))} /></td>
                            </>
                          ) : (
                            <>
                              <td style={ui.td}>{r.form_id ? <Syr size="1.2rem">{r.form_west || r.form_skeleton}</Syr> : '—'}</td>
                              <td style={ui.td}>{r.form_east ? <Syr size="1.2rem">{r.form_east}</Syr> : '—'}</td>
                            </>
                          )}
                          <td style={ui.td}>
                            <MatchBadge {...MATCH_LABEL[r.match]} />
                            {r.form_is_generated && <span title="Motor üretti" style={{ marginLeft: 4, fontSize: '0.7rem', color: 'var(--color-text-subtle)' }}>⚙</span>}
                          </td>
                          <td style={ui.td}>{r.form_status && <StatusBadge status={r.form_status} />}</td>
                          <td style={{ ...ui.td, whiteSpace: 'nowrap' }}>
                            {r.form_id && role && (ed ? (
                              <>
                                <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => saveEdit(r.form_id!)}>Kaydet</button>
                                <button className="btn btn-sm btn-ghost" onClick={() => setEdits((x) => { const rest = { ...x }; delete rest[r.form_id!]; return rest })}>Vazgeç</button>
                              </>
                            ) : (
                              <>
                                <button className="btn btn-sm btn-ghost" onClick={() => setEdits((x) => ({ ...x, [r.form_id!]: { west: r.form_west ?? '', east: r.form_east ?? '' } }))}>Düzelt</button>
                                {(r.match === 'differs' || r.match === 'differs_vowel') && (
                                  <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => takeEngine(r)}>Motorunkini al</button>
                                )}
                                {mediaBtn(r.form_id!)}
                                {role === 'admin' && (
                                  <button className="btn btn-sm btn-ghost" style={{ color: 'var(--color-danger)' }} disabled={busy} onClick={() => deleteForm(r.form_id!)}>Sil</button>
                                )}
                              </>
                            ))}
                          </td>
                        </tr>
                        {r.form_id && mediaOpen === r.form_id && (
                          <tr><td colSpan={7} style={{ ...ui.td, background: 'var(--color-bg-subtle)' }}>
                            <MediaPanel target={{ field: 'word_form_id', id: r.form_id }} role={role ?? null} compact />
                          </td></tr>
                        )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {affixed.length > 0 && (
            <section className="card" style={ui.card}>
              <h2 style={ui.h2}>Ekli / önekli formlar <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>motor karşılaştırmasına girmez</span></h2>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {affixed.map((f) => (
                    <Fragment key={f.id}>
                    <tr>
                      <td style={{ ...ui.td, fontSize: '0.85rem' }}>
                        {cellLabel(f)}
                        {(f.suffix_person || f.suffix_number || f.suffix_gender) && <> · ek: {cellLabel({ verb_form: null, state: null, person: f.suffix_person, number: f.suffix_number, gender: f.suffix_gender })}</>}
                        {f.proclitics && <> · önek: <Syr size="1rem">{f.proclitics}</Syr></>}
                      </td>
                      <td style={ui.td}><Syr size="1.2rem">{f.form_west || f.form_east || f.form_skeleton}</Syr></td>
                      <td style={ui.td}><StatusBadge status={f.status} /></td>
                      <td style={{ ...ui.td, whiteSpace: 'nowrap' }}>
                        {role && mediaBtn(f.id)}
                        {role === 'admin' && <button className="btn btn-sm btn-ghost" style={{ color: 'var(--color-danger)' }} disabled={busy} onClick={() => deleteForm(f.id)}>Sil</button>}
                      </td>
                    </tr>
                    {mediaOpen === f.id && (
                      <tr><td colSpan={4} style={{ ...ui.td, background: 'var(--color-bg-subtle)' }}>
                        <MediaPanel target={{ field: 'word_form_id', id: f.id }} role={role ?? null} compact />
                      </td></tr>
                    )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {role && (
            <section className="card" style={ui.card}>
              <h2 style={ui.h2}>Elle form ekle</h2>
              <div style={ui.grid}>
                <Field label="Batı harekeli">
                  <input className="input" dir="rtl" lang="syr" style={ui.syrInput} value={nf.west} onChange={(e) => setNf({ ...nf, west: e.target.value })} />
                </Field>
                <Field label="Doğu harekeli">
                  <input className="input" dir="rtl" lang="syr" style={ui.syrInput} value={nf.east} onChange={(e) => setNf({ ...nf, east: e.target.value })} />
                </Field>
                {isVerb && (
                  <Sel label="Çekim" value={nf.verb_form} onChange={(x) => setNf({ ...nf, verb_form: x })} options={VERB_FORM_LABEL} />
                )}
                <Sel label="Şahıs" value={nf.person} onChange={(x) => setNf({ ...nf, person: x })} options={{ first: '1.', second: '2.', third: '3.' }} />
                <Sel label="Sayı" value={nf.number} onChange={(x) => setNf({ ...nf, number: x })} options={{ singular: 'Tekil', plural: 'Çoğul' }} />
                <Sel label="Cinsiyet" value={nf.gender} onChange={(x) => setNf({ ...nf, gender: x })} options={{ masculine: 'Eril', feminine: 'Dişil', common: 'Ortak' }} />
                {!isVerb && <Sel label="Durum (state)" value={nf.state} onChange={(x) => setNf({ ...nf, state: x })} options={STATE_LABEL} />}
                <Sel label="Zamir eki: şahıs" value={nf.suffix_person} onChange={(x) => setNf({ ...nf, suffix_person: x })} options={{ first: '1.', second: '2.', third: '3.' }} />
                <Sel label="Zamir eki: sayı" value={nf.suffix_number} onChange={(x) => setNf({ ...nf, suffix_number: x })} options={{ singular: 'Tekil', plural: 'Çoğul' }} />
                <Sel label="Zamir eki: cinsiyet" value={nf.suffix_gender} onChange={(x) => setNf({ ...nf, suffix_gender: x })} options={{ masculine: 'Eril', feminine: 'Dişil', common: 'Ortak' }} />
                <Field label="Önekler (ܘ ܕ ܠ ܒ)">
                  <input className="input" dir="rtl" lang="syr" style={ui.syrInput} value={nf.proclitics} onChange={(e) => setNf({ ...nf, proclitics: e.target.value })} />
                </Field>
              </div>
              <button className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem' }} disabled={busy} onClick={addForm}>+ Formu ekle</button>
            </section>
          )}

          {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}
          {msg && <p style={{ color: 'var(--color-success)' }}>{msg}</p>}

          {isEditor && formCount > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Bütün formlar ({formCount}):</span>
              <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => bulkStatus('reviewed')}>İncelendi</button>
              <button className="btn btn-accent btn-sm" disabled={busy} onClick={() => bulkStatus('published')}>Yayımla</button>
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => bulkStatus('draft')}>Taslağa al</button>
            </div>
          )}
        </>
      )}
    </main>
  )
}

function Sel({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: Record<string, string>
}) {
  return (
    <Field label={label}>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {Object.entries(options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </Field>
  )
}

const cellInput: React.CSSProperties = { fontSize: '1.1rem', textAlign: 'right', minHeight: 34, minWidth: 110 }
