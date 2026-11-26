'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  lexDb, sourceError, syrSkeleton, isSyriac, safeTerm, pageLabel, POS_LABEL,
  DICT_ENTRY_SELECT, type DictEntryRow, type PageRow, type Status,
} from '@/lib/lex'
import { StatusBadge, Syr, Field, ui } from '../../components'

type Draft = {
  id?: string; headword_raw: string; locus: string; page_id: string; entry_text_raw: string
  lexeme_id: string; sense_id: string; source_note: string
}
const blank = (pageId: string | null): Draft => ({
  headword_raw: '', locus: '', page_id: pageId ?? '', entry_text_raw: '', lexeme_id: '', sense_id: '', source_note: '',
})
const toDraft = (r: DictEntryRow): Draft => ({
  id: r.id, headword_raw: r.headword_raw, locus: r.locus ?? '', page_id: r.page_id ?? '',
  entry_text_raw: r.entry_text_raw ?? '', lexeme_id: r.lexeme_id ?? '', sense_id: r.sense_id ?? '', source_note: r.source_note ?? '',
})

type LexHit = {
  id: string; lemma_west: string | null; lemma_east: string | null; lemma_skeleton: string; pos: string; homonym_no: number
  sense: { id: string; sense_no: number; gloss: { lang: string; text: string; is_primary: boolean }[] }[]
}
const LEX_HIT_SELECT = 'id,lemma_west,lemma_east,lemma_skeleton,pos,homonym_no,sense(id,sense_no,gloss(lang,text,is_primary))'
const senseText = (s: LexHit['sense'][number]) => {
  const g = s.gloss.find((x) => x.lang === 'tr' && x.is_primary) ?? s.gloss.find((x) => x.lang === 'tr') ?? s.gloss[0]
  return `${s.sense_no}${g ? ` (${g.text})` : ''}`
}

const LIMIT = 200

function fetchEntries(workId: string, pageId: string | null, term: string) {
  let q = lexDb().from('dictionary_entry').select(DICT_ENTRY_SELECT).eq('source_work_id', workId)
  if (pageId) q = q.eq('page_id', pageId)
  const t = safeTerm(term)
  if (t) q = isSyriac(t) ? q.ilike('headword_skeleton', `%${syrSkeleton(t)}%`) : q.or(`locus.ilike.%${t}%,entry_text_raw.ilike.%${t}%`)
  return q.order('created_at').limit(LIMIT)
}

// Basılı sözlük maddeleri: aslıyla girilir, isteğe bağlı olarak sözlüğümüzdeki maddeye/anlama bağlanır
export function Entries({ workId, pages, pageId, role, locale }: {
  workId: string
  pages: PageRow[]
  pageId: string | null
  role: string | null
  locale: string
}) {
  const isEditor = role === 'editor' || role === 'admin'
  const [rows, setRows] = useState<DictEntryRow[] | null>(null)
  const [term, setTerm] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [hits, setHits] = useState<LexHit[]>([])
  const [lexQ, setLexQ] = useState('')
  const pageOf = new Map(pages.map((p) => [p.id, p]))

  const apply = useCallback(({ data, error: e }: { data: unknown; error: { code?: string; message?: string } | null }) => {
    if (e) setError(sourceError(e))
    setRows((data as DictEntryRow[] | null) ?? [])
  }, [])

  useEffect(() => {
    fetchEntries(workId, pageId, '').then(apply)
  }, [workId, pageId, apply])

  const reload = () => fetchEntries(workId, pageId, term).then(apply)

  // Seçili sayfa değişince açık yeni kayıt formu o sayfaya geçer
  const [formPage, setFormPage] = useState(pageId)
  if (formPage !== pageId) {
    setFormPage(pageId)
    if (draft && !draft.id) setDraft({ ...draft, page_id: pageId ?? '' })
  }

  // Başlık kelimesiyle aynı iskelete sahip maddeler (bağlama önerisi)
  const headSkel = syrSkeleton(draft?.headword_raw)
  const searchKey = draft ? (lexQ.trim() || headSkel) : ''
  useEffect(() => {
    if (!searchKey) return
    const t = safeTerm(searchKey)
    const q = lexDb().from('lexeme').select(LEX_HIT_SELECT).limit(20)
    const run = isSyriac(t)
      ? (lexQ.trim() ? q.ilike('lemma_skeleton', `%${syrSkeleton(t)}%`) : q.eq('lemma_skeleton', syrSkeleton(t)))
      : q.ilike('transliteration', `%${t}%`)
    run.then(({ data }) => setHits((data ?? []) as unknown as LexHit[]))
  }, [searchKey, lexQ])

  // Bağlı maddenin önerilerde olmaması durumunda da adı görünsün
  const [linked, setLinked] = useState<LexHit | null>(null)
  const linkedId = draft?.lexeme_id ?? ''
  useEffect(() => {
    if (!linkedId) return
    lexDb().from('lexeme').select(LEX_HIT_SELECT).eq('id', linkedId).maybeSingle()
      .then(({ data }) => setLinked((data ?? null) as unknown as LexHit | null))
  }, [linkedId])
  const chosen = linkedId ? (hits.find((h) => h.id === linkedId) ?? (linked?.id === linkedId ? linked : null)) : null
  const shownHits = searchKey ? hits : []

  const setD = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d))

  function open(d: Draft) {
    setDraft(d); setLexQ(''); setHits([]); setError(''); setMsg('')
  }

  async function save(keepOpen: boolean) {
    if (!draft) return
    setError(''); setMsg('')
    if (!draft.headword_raw.trim()) { setError('Başlık kelimesi gerekli.'); return }
    const row = {
      headword_raw: draft.headword_raw.trim(),
      locus: draft.locus.trim() || null,
      page_id: draft.page_id || null,
      entry_text_raw: draft.entry_text_raw.trim() || null,
      lexeme_id: draft.lexeme_id || null,
      sense_id: draft.lexeme_id ? draft.sense_id || null : null,
      source_note: draft.source_note.trim() || null,
    }
    setBusy(true)
    const db = lexDb().from('dictionary_entry')
    const { error: e, count } = draft.id
      ? await db.update(row, { count: 'exact' }).eq('id', draft.id)
      : await db.insert({ ...row, source_work_id: workId, origin: 'human' }, { count: 'exact' })
    setBusy(false)
    if (e || !count) { setError(e ? sourceError(e) : 'Kaydedilemedi (yetki yok).'); return }
    setMsg(draft.id ? 'Güncellendi.' : 'Eklendi.')
    if (keepOpen && !draft.id) open({ ...blank(draft.page_id || pageId), locus: '' })
    else setDraft(null)
    reload()
  }

  async function changeStatus(id: string, status: Status) {
    setError(''); setMsg('')
    const { error: e, count } = await lexDb().from('dictionary_entry').update({ status }, { count: 'exact' }).eq('id', id)
    if (e || !count) { setError(e ? sourceError(e) : 'Durum değiştirilemedi (yetki yok).'); return }
    reload()
  }

  async function remove(id: string) {
    if (confirmDel !== id) { setConfirmDel(id); return }
    setConfirmDel(null); setError(''); setMsg('')
    const { error: e, count } = await lexDb().from('dictionary_entry').delete({ count: 'exact' }).eq('id', id)
    if (e || !count) { setError(e ? sourceError(e) : 'Silinemedi (yetki yok).'); return }
    if (draft?.id === id) setDraft(null)
    reload()
  }

  const page = pageId ? pageOf.get(pageId) : null

  return (
    <section className="card" style={{ ...ui.card, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        <h2 style={{ ...ui.h2, margin: 0 }}>
          Sözlük maddeleri{page ? ` · sayfa ${pageLabel(page)}` : ''}
          {rows && <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}> ({rows.length}{rows.length === LIMIT ? '+' : ''})</span>}
        </h2>
        {role && !draft && (
          <button className="btn btn-sm btn-secondary" style={{ marginLeft: 'auto' }} onClick={() => open(blank(pageId))}>+ Madde ekle</button>
        )}
      </div>

      {draft && (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: '0.75rem', marginBottom: '0.75rem', background: 'var(--color-bg-subtle)' }}>
          <strong>{draft.id ? 'Sözlük maddesini düzenle' : 'Yeni sözlük maddesi'}</strong>
          <div style={{ ...ui.grid, marginTop: '0.5rem' }}>
            <Field label="Başlık kelimesi (sözlükte yazıldığı gibi)">
              <input className="input" dir="rtl" lang="syr" style={ui.syrInput} value={draft.headword_raw} autoFocus
                onChange={(e) => setD({ headword_raw: e.target.value })} />
            </Field>
            <Field label="Yer (I, 213b…)">
              <input className="input" value={draft.locus} onChange={(e) => setD({ locus: e.target.value })} />
            </Field>
            <Field label="Sayfa">
              <select className="input" value={draft.page_id} onChange={(e) => setD({ page_id: e.target.value })}>
                <option value="">—</option>
                {pages.map((p) => <option key={p.id} value={p.id}>{pageLabel(p)}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <Field label="Sözlükteki metin (olduğu gibi)">
              <textarea className="input" dir="auto" rows={4} value={draft.entry_text_raw} onChange={(e) => setD({ entry_text_raw: e.target.value })} />
            </Field>
          </div>

          <div style={{ marginTop: '0.6rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Sözlüğümüzdeki madde (isteğe bağlı)</div>
            {chosen ? (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <Syr>{chosen.lemma_west || chosen.lemma_east || chosen.lemma_skeleton}</Syr>
                <span style={{ fontSize: '0.8rem' }}>{POS_LABEL[chosen.pos] ?? chosen.pos}{chosen.homonym_no > 1 ? ` · ${chosen.homonym_no}` : ''}</span>
                <select className="input" style={{ width: 220 }} value={draft.sense_id} onChange={(e) => setD({ sense_id: e.target.value })}>
                  <option value="">Anlam: — (maddenin tümü)</option>
                  {[...chosen.sense].sort((a, b) => a.sense_no - b.sense_no).map((s) => <option key={s.id} value={s.id}>Anlam {senseText(s)}</option>)}
                </select>
                <button className="btn btn-sm btn-ghost" onClick={() => setD({ lexeme_id: '', sense_id: '' })}>Bağlantıyı kaldır</button>
              </div>
            ) : (
              <>
                <input className="input" placeholder="Madde ara (Süryanice veya transliterasyon); boşsa başlık kelimesiyle eşleşenler"
                  value={lexQ} onChange={(e) => setLexQ(e.target.value)} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.35rem' }}>
                  {shownHits.map((h) => (
                    <button key={h.id} className="btn btn-sm btn-secondary" onClick={() => setD({ lexeme_id: h.id, sense_id: h.sense.length === 1 ? h.sense[0].id : '' })}>
                      <Syr size="1.05rem">{h.lemma_west || h.lemma_east || h.lemma_skeleton}</Syr>
                      <span style={{ fontSize: '0.75rem', marginLeft: 4 }}>{POS_LABEL[h.pos] ?? h.pos}{h.sense[0] ? ` · ${senseText(h.sense[0])}` : ''}</span>
                    </button>
                  ))}
                  {searchKey && shownHits.length === 0 && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Eşleşen madde yok; bağlantısız da kaydedilebilir.</span>
                  )}
                </div>
              </>
            )}
          </div>

          <div style={{ marginTop: '0.5rem' }}>
            <Field label="Kaynak notu">
              <input className="input" value={draft.source_note} onChange={(e) => setD({ source_note: e.target.value })} />
            </Field>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-sm" onClick={() => save(false)} disabled={busy}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
            {!draft.id && <button className="btn btn-secondary btn-sm" onClick={() => save(true)} disabled={busy}>Kaydet ve yenisini ekle</button>}
            <button className="btn btn-ghost btn-sm" onClick={() => { setDraft(null); setError('') }}>Vazgeç</button>
          </div>
        </div>
      )}
      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}
      {msg && <p style={{ color: 'var(--color-success)' }}>{msg}</p>}

      <form onSubmit={(e) => { e.preventDefault(); reload() }} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <input className="input" style={{ flex: 1 }} placeholder="Başlık kelimesi (Süryanice), yer veya metinde ara" value={term} onChange={(e) => setTerm(e.target.value)} />
        <button className="btn btn-sm btn-secondary" type="submit">Ara</button>
      </form>

      {rows === null ? <p>Yükleniyor…</p> : rows.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>Kayıt yok.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {rows.map((r) => {
            const locked = !isEditor && (r.status === 'reviewed' || r.status === 'published')
            const p = r.page_id ? pageOf.get(r.page_id) : null
            return (
              <div key={r.id} style={{ borderTop: '1px solid var(--color-border)', padding: '0.5rem 0', background: draft?.id === r.id ? 'var(--color-accent-light)' : undefined }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Syr>{r.headword_raw}</Syr>
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                    {[r.locus, p && !pageId ? `sayfa ${pageLabel(p)}` : null].filter(Boolean).join(' · ')}
                  </span>
                  <span style={{ fontSize: '0.78rem' }}>
                    {r.lexeme ? (
                      <Link href={`/${locale}/admin/lex/madde/${r.lexeme.id}`}>→ <Syr size="1rem">{r.lexeme.lemma_west || r.lexeme.lemma_east || r.lexeme.lemma_skeleton}</Syr></Link>
                    ) : <span style={{ color: 'var(--color-text-subtle)' }}>bağlı madde yok</span>}
                  </span>
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <StatusBadge status={r.status} />
                    {role && !locked && <button className="btn btn-sm btn-ghost" onClick={() => open(toDraft(r))}>Düzenle</button>}
                    {isEditor && r.status !== 'published' && <button className="btn btn-sm btn-accent" onClick={() => changeStatus(r.id, 'published')}>Yayımla</button>}
                    {isEditor && r.status !== 'draft' && <button className="btn btn-sm btn-ghost" onClick={() => changeStatus(r.id, 'draft')}>Taslağa al</button>}
                    {role === 'admin' && (
                      <button className="btn btn-sm btn-ghost" style={{ color: 'var(--color-danger)' }} onClick={() => remove(r.id)} onBlur={() => setConfirmDel(null)}>
                        {confirmDel === r.id ? 'Emin misiniz?' : 'Sil'}
                      </button>
                    )}
                  </span>
                </div>
                {r.entry_text_raw && (
                  <div dir="auto" style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', marginTop: '0.2rem', color: 'var(--color-text-muted)' }}>
                    {r.entry_text_raw.length > 400 ? r.entry_text_raw.slice(0, 400) + '…' : r.entry_text_raw}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
