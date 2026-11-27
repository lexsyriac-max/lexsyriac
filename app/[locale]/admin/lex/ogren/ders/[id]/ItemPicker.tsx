'use client'

import { useState } from 'react'
import {
  lexDb, syrSkeleton, isSyriac, safeTerm, learningError, POS_LABEL, VERB_FORM_LABEL,
  PERSON_SHORT, NUMBER_SHORT, GENDER_SHORT,
  type ContentItem, type Status, type VerbForm, type Person, type GramNumber, type Gender,
} from '@/lib/lex'
import { Syr, StatusBadge, ui } from '../../../components'

type Mode = 'sense' | 'word_form' | 'example' | 'paradigm' | 'text'
const MODES: [Mode, string][] = [
  ['sense', 'Kelime'], ['word_form', 'Form'], ['example', 'Örnek cümle'], ['paradigm', 'Çekim tablosu'], ['text', 'Metin'],
]

type LexHit = {
  id: string; lemma_skeleton: string; lemma_west: string | null; lemma_east: string | null; pos: string; status: Status
  sense: { id: string; sense_no: number; status: Status; gloss: { lang: string; text: string; is_primary: boolean }[] }[]
}
type FormHit = {
  id: string; form_skeleton: string; form_west: string | null; form_east: string | null; status: Status
  verb_form: VerbForm | null; person: Person | null; number: GramNumber | null; gender: Gender | null
  lexeme: { lemma_skeleton: string; lemma_west: string | null } | null
}
type ExHit = { id: string; text_skeleton: string; text_west: string | null; text_east: string | null; status: Status; example_translation: { lang: string; text: string }[] }
type ClassHit = { id: string; code: string; label: string | null; status: Status }
type Hits = { kind: 'sense'; rows: LexHit[] } | { kind: 'word_form'; rows: FormHit[] } | { kind: 'example'; rows: ExHit[] } | { kind: 'paradigm'; rows: ClassHit[] }

const LIMIT = 30

async function lexemeIdsByGloss(term: string): Promise<string[]> {
  const { data } = await lexDb().from('gloss').select('sense:sense_id(lexeme_id)').ilike('text', `%${term}%`).limit(200)
  return Array.from(new Set(((data ?? []) as unknown as { sense: { lexeme_id: string } | null }[])
    .map((x) => x.sense?.lexeme_id).filter(Boolean) as string[]))
}

async function searchHits(mode: Mode, raw: string): Promise<{ hits: Hits | null; error: string }> {
  const db = lexDb()
  const term = safeTerm(raw)
  if (mode === 'paradigm') {
    const { data, error } = await db.from('paradigm_class').select('id,code,label,status').order('code')
    return { hits: { kind: 'paradigm', rows: (data ?? []) as ClassHit[] }, error: learningError(error) }
  }
  if (!term) return { hits: null, error: '' }
  if (mode === 'sense') {
    let q = db.from('lexeme')
      .select('id,lemma_skeleton,lemma_west,lemma_east,pos,status,sense(id,sense_no,status,gloss(lang,text,is_primary))')
      .order('lemma_skeleton').limit(LIMIT)
    if (isSyriac(term)) q = q.ilike('lemma_skeleton', `%${syrSkeleton(term)}%`)
    else {
      const ids = await lexemeIdsByGloss(term)
      const ors = [`transliteration.ilike.%${term}%`]
      if (ids.length) ors.push(`id.in.(${ids.slice(0, 150).join(',')})`)
      q = q.or(ors.join(','))
    }
    const { data, error } = await q
    return { hits: { kind: 'sense', rows: (data ?? []) as unknown as LexHit[] }, error: learningError(error) }
  }
  if (mode === 'word_form') {
    let q = db.from('word_form')
      .select('id,form_skeleton,form_west,form_east,status,verb_form,person,number,gender,lexeme:lexeme_id(lemma_skeleton,lemma_west)')
      .order('form_skeleton').limit(LIMIT)
    if (isSyriac(term)) q = q.ilike('form_skeleton', `%${syrSkeleton(term)}%`)
    else q = q.ilike('transliteration', `%${term}%`)
    const { data, error } = await q
    return { hits: { kind: 'word_form', rows: (data ?? []) as unknown as FormHit[] }, error: learningError(error) }
  }
  let q = db.from('example').select('id,text_skeleton,text_west,text_east,status,example_translation(lang,text)')
    .order('updated_at', { ascending: false }).limit(LIMIT)
  if (isSyriac(term)) q = q.ilike('text_skeleton', `%${syrSkeleton(term)}%`)
  else {
    const { data: t } = await db.from('example_translation').select('example_id').ilike('text', `%${term}%`).limit(150)
    const ids = Array.from(new Set((t ?? []).map((x) => x.example_id as string)))
    const ors = [`transliteration.ilike.%${term}%`]
    if (ids.length) ors.push(`id.in.(${ids.join(',')})`)
    q = q.or(ors.join(','))
  }
  const { data, error } = await q
  return { hits: { kind: 'example', rows: (data ?? []) as unknown as ExHit[] }, error: learningError(error) }
}

const glossLine = (g: { lang: string; text: string; is_primary: boolean }[]) =>
  ['tr', 'en', 'de'].map((l) => g.filter((x) => x.lang === l).sort((a, b) => Number(b.is_primary) - Number(a.is_primary))[0])
    .filter(Boolean).map((x) => `${x!.lang}: ${x!.text}`).join(' · ')

export function ItemPicker({ lessonId, existing, busy, onClose, onRun }: {
  lessonId: string; existing: ContentItem[]; busy: boolean; onClose: () => void
  onRun: (p: PromiseLike<string>, ok?: string) => Promise<void>
}) {
  const [mode, setMode] = useState<Mode>('sense')
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Hits | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [body, setBody] = useState('')

  const has = (field: 'sense_id' | 'word_form_id' | 'example_id' | 'paradigm_class_id', id: string) =>
    existing.some((it) => it[field] === id)

  async function search(m: Mode = mode, term: string = q) {
    setLoading(true); setError('')
    const r = await searchHits(m, term)
    setHits(r.hits); setError(r.error); setLoading(false)
  }
  function switchMode(m: Mode) {
    setMode(m); setHits(null); setError('')
    if (m === 'paradigm') search(m, '')
  }
  function add(row: Record<string, string>) {
    return onRun(lexDb().from('lesson_item').insert({ lesson_id: lessonId, ...row })
      .then(({ error: e }) => learningError(e)), 'Eklendi.')
  }
  async function addText() {
    if (!body.trim()) return
    await add({ body: body.trim() })
    setBody('')
  }

  const addBtn = (field: 'sense_id' | 'word_form_id' | 'example_id' | 'paradigm_class_id', id: string) =>
    has(field, id)
      ? <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>derste</span>
      : <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => add({ [field]: id })}>Ekle</button>

  return (
    <div style={{ marginTop: '0.9rem', paddingTop: '0.9rem', borderTop: '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
        {MODES.map(([m, label]) => (
          <button key={m} className={`btn btn-sm ${mode === m ? 'btn-primary' : 'btn-ghost'}`} onClick={() => switchMode(m)}>{label}</button>
        ))}
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={onClose}>Kapat</button>
      </div>

      {mode === 'text' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <textarea className="input" rows={4} value={body} placeholder="Açıklama, dilbilgisi notu, okuma yönergesi…"
            onChange={(e) => setBody(e.target.value)} />
          <div><button className="btn btn-primary btn-sm" disabled={busy || !body.trim()} onClick={addText}>Metni ekle</button></div>
        </div>
      ) : mode !== 'paradigm' && (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input className="input" style={{ flex: 1, ...(isSyriac(q) ? ui.syrInput : {}) }} value={q} autoFocus
            dir={isSyriac(q) ? 'rtl' : 'ltr'}
            placeholder={mode === 'word_form' ? 'Süryanice form veya transliterasyon' : 'Süryanice, TR/EN/DE anlam veya transliterasyon'}
            onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') search() }} />
          <button className="btn btn-secondary btn-sm" disabled={loading || !q.trim()} onClick={() => search()}>Ara</button>
        </div>
      )}

      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}
      {loading && <p>Aranıyor…</p>}
      {hits && !loading && (
        hits.rows.length === 0 ? <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Sonuç yok.</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', marginTop: '0.5rem' }}>
            <tbody>
              {hits.kind === 'sense' && hits.rows.flatMap((l) => (l.sense.length ? l.sense : [null]).map((s) => (
                <tr key={l.id + (s?.id ?? '')}>
                  <td style={ui.td}><Syr>{l.lemma_west || l.lemma_east || l.lemma_skeleton}</Syr></td>
                  <td style={{ ...ui.td, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{POS_LABEL[l.pos] ?? l.pos}{s && l.sense.length > 1 ? ` · ${s.sense_no}. anlam` : ''}</td>
                  <td style={ui.td}>{s ? glossLine(s.gloss) || '—' : <i>anlam yok</i>}</td>
                  <td style={ui.td}><StatusBadge status={s ? s.status : l.status} /></td>
                  <td style={{ ...ui.td, textAlign: 'right' }}>{s && addBtn('sense_id', s.id)}</td>
                </tr>
              )))}
              {hits.kind === 'word_form' && hits.rows.map((f) => (
                <tr key={f.id}>
                  <td style={ui.td}><Syr>{f.form_west || f.form_east || f.form_skeleton}</Syr></td>
                  <td style={{ ...ui.td, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                    {[f.verb_form && VERB_FORM_LABEL[f.verb_form], f.person && PERSON_SHORT[f.person], f.number && NUMBER_SHORT[f.number], f.gender && GENDER_SHORT[f.gender]].filter(Boolean).join(' ')}
                  </td>
                  <td style={ui.td}>{f.lexeme && <Syr size="1.05rem">{f.lexeme.lemma_west || f.lexeme.lemma_skeleton}</Syr>}</td>
                  <td style={ui.td}><StatusBadge status={f.status} /></td>
                  <td style={{ ...ui.td, textAlign: 'right' }}>{addBtn('word_form_id', f.id)}</td>
                </tr>
              ))}
              {hits.kind === 'example' && hits.rows.map((x) => (
                <tr key={x.id}>
                  <td style={ui.td}><Syr>{x.text_west || x.text_east || x.text_skeleton}</Syr></td>
                  <td style={ui.td}>{x.example_translation.find((t) => t.lang === 'tr')?.text ?? x.example_translation[0]?.text ?? '—'}</td>
                  <td style={ui.td}><StatusBadge status={x.status} /></td>
                  <td style={{ ...ui.td, textAlign: 'right' }}>{addBtn('example_id', x.id)}</td>
                </tr>
              ))}
              {hits.kind === 'paradigm' && hits.rows.map((c) => (
                <tr key={c.id}>
                  <td style={ui.td}><code>{c.code}</code></td>
                  <td style={ui.td}>{c.label ?? '—'}</td>
                  <td style={ui.td}><StatusBadge status={c.status} /></td>
                  <td style={{ ...ui.td, textAlign: 'right' }}>{addBtn('paradigm_class_id', c.id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </div>
  )
}
