'use client'

import { useState } from 'react'
import {
  lexDb, learningError, reorder, moved, defaultConfig, itemFitsExercise,
  EXERCISE_KIND_LABEL, EXERCISE_KIND_HELP, VOCAB_EXERCISES, LANGS,
  type ContentItem, type ExerciseRow, type ExerciseKind, type ExerciseConfig, type Lang,
} from '@/lib/lex'
import { Syr, Field, ui } from '../../../components'
import { StatusControl, MoveButtons } from '../../shared'
import { ItemSummary, itemSyriac } from './LessonItems'

const KINDS = Object.keys(EXERCISE_KIND_LABEL) as ExerciseKind[]
const LANG_LABEL: Record<Lang, string> = { tr: 'Türkçe', en: 'İngilizce', de: 'Almanca' }

// Ayarın bu ders için uyarıları (kaydı engellemez; kural ihlalini veritabanı reddeder)
function warnings(kind: ExerciseKind, c: ExerciseConfig, items: ContentItem[]): string[] {
  const pool = (c.items ? items.filter((i) => c.items!.includes(i.id)) : items).filter((i) => itemFitsExercise(kind, i))
  const w: string[] = []
  if (pool.length === 0) w.push(VOCAB_EXERCISES.includes(kind) ? 'Derste kelime/form içeriği yok.' : 'Derste örnek cümle yok.')
  if (kind === 'listening' && pool.length > 0 && !pool.some((i) => i.audio?.length)) w.push('Seçilen içeriğin hiçbirinde ses yok.')
  if ((kind === 'multiple_choice' || kind === 'listening') && pool.length > 0 && pool.length < (c.choices ?? 4))
    w.push(`Seçenek sayısı (${c.choices ?? 4}) içerik sayısından (${pool.length}) fazla; eksik seçenekler başka derslerden gelmez.`)
  if (kind === 'matching' && pool.length > 0 && pool.length < 3) w.push('Eşleştirme için en az 3 içerik gerekir.')
  if (kind === 'fill_blank') {
    const missing = pool.filter((i) => !(c.blanks && i.id in c.blanks)).length
    if (missing) w.push(`${missing} cümlede boşluk seçilmedi; oynatıcı rastgele bir kelime seçer.`)
  }
  return w
}

export function Exercises({ lessonId, items, exercises, canWrite, canEdit, lessonLocked, busy, onRun }: {
  lessonId: string; items: ContentItem[]; exercises: ExerciseRow[]; canWrite: boolean; canEdit: boolean
  lessonLocked: boolean; busy: boolean; onRun: (p: PromiseLike<string>, ok?: string) => Promise<void>
}) {
  const [kind, setKind] = useState<ExerciseKind>('flashcard')
  const [open, setOpen] = useState<string | null>(null)

  async function create() {
    let newId = ''
    await onRun(lexDb().from('exercise').insert({ lesson_id: lessonId, kind, config: defaultConfig(kind), title: EXERCISE_KIND_LABEL[kind] })
      .select('id').single().then(({ data, error: e }) => { newId = data?.id ?? ''; return learningError(e) }))
    if (newId) setOpen(newId)
  }

  return (
    <section className="card" style={ui.card}>
      <h2 style={ui.h2}>Alıştırmalar <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>({exercises.length})</span></h2>
      <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: 0 }}>
        Alıştırma, dersin içerik satırlarını kullanır; kelime kopyalanmaz. Ziyaretçi yalnız yayımlanmış alıştırmayı görür.
      </p>
      {exercises.map((ex, i) => (
        <ExerciseCard key={ex.id} ex={ex} index={i} count={exercises.length} items={items}
          canWrite={canWrite} canEdit={canEdit} busy={busy} open={open === ex.id}
          onToggle={() => setOpen(open === ex.id ? null : ex.id)}
          onMove={(d) => onRun(reorder('exercise', moved(exercises, i, d).map((x) => x.id)))}
          onRun={onRun} />
      ))}
      {canWrite && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.75rem' }}>
          <select className="input" style={{ width: 'auto' }} value={kind} onChange={(e) => setKind(e.target.value as ExerciseKind)}>
            {KINDS.map((k) => <option key={k} value={k}>{EXERCISE_KIND_LABEL[k]}</option>)}
          </select>
          <button className="btn btn-secondary btn-sm" disabled={busy} onClick={create}>+ Alıştırma</button>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{EXERCISE_KIND_HELP[kind]}</span>
        </div>
      )}
      {lessonLocked && <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Ders kilitli olsa da taslak alıştırmalar düzenlenebilir.</p>}
    </section>
  )
}

function ExerciseCard({ ex, index, count, items, canWrite, canEdit, busy, open, onToggle, onMove, onRun }: {
  ex: ExerciseRow; index: number; count: number; items: ContentItem[]; canWrite: boolean; canEdit: boolean; busy: boolean
  open: boolean; onToggle: () => void; onMove: (d: -1 | 1) => void; onRun: (p: PromiseLike<string>, ok?: string) => Promise<void>
}) {
  const [c, setC] = useState<ExerciseConfig>(ex.config ?? {})
  const [title, setTitle] = useState(ex.title ?? '')
  const [instructions, setInstructions] = useState(ex.instructions ?? '')
  const locked = (ex.status === 'reviewed' || ex.status === 'published') && !canEdit
  const editable = canWrite && !locked
  const fitting = items.filter((i) => itemFitsExercise(ex.kind, i))
  const pool = c.items ? fitting.filter((i) => c.items!.includes(i.id)) : fitting
  const warn = warnings(ex.kind, c, items)

  function set<K extends keyof ExerciseConfig>(k: K, v: ExerciseConfig[K] | undefined) {
    const n = { ...c }
    if (v === undefined) delete n[k]; else n[k] = v
    setC(n)
  }
  function toggleItem(id: string) {
    const cur = c.items ?? fitting.map((i) => i.id)
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : fitting.filter((i) => cur.includes(i.id) || i.id === id).map((i) => i.id)
    const n: ExerciseConfig = { ...c, items: next }
    if (n.blanks) n.blanks = Object.fromEntries(Object.entries(n.blanks).filter(([k]) => next.includes(k)))
    setC(n)
  }
  function save() {
    const cfg = { ...c }
    if (cfg.items && cfg.items.length === 0) { onRun(Promise.resolve('En az bir içerik seçin veya "Dersin bütün uygun içeriği"ni işaretleyin.')); return }
    return onRun(lexDb().from('exercise').update({ config: cfg, title: title.trim() || null, instructions: instructions.trim() || null })
      .eq('id', ex.id).then(({ error: e }) => learningError(e)), 'Alıştırma kaydedildi.')
  }
  async function remove() {
    if (!confirm('Alıştırma silinsin mi?')) return
    await onRun(lexDb().from('exercise').delete().eq('id', ex.id).select('id').single()
      .then(({ error: e }) => e ? (e.code === 'PGRST116' ? 'Silinemedi: silme yalnız admin yetkisiyle yapılır.' : learningError(e)) : ''))
  }

  const num = (k: 'choices' | 'pairs', min: number, max: number, label: string) => (
    <Field label={label}>
      <input className="input" type="number" min={min} max={max} value={c[k] ?? ''} disabled={!editable} style={{ width: 90 }}
        onChange={(e) => set(k, e.target.value === '' ? undefined : Math.max(min, Math.min(max, Number(e.target.value))))} />
    </Field>
  )

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: '0.6rem 0.75rem', marginBottom: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--color-text-subtle)', fontSize: '0.85rem' }}>{ex.seq}.</span>
        <strong>{ex.title || EXERCISE_KIND_LABEL[ex.kind]}</strong>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{EXERCISE_KIND_LABEL[ex.kind]} · {pool.length} içerik</span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
          <StatusControl status={ex.status} canEdit={canEdit} busy={busy}
            onChange={(s) => onRun(lexDb().from('exercise').update({ status: s }).eq('id', ex.id).then(({ error: e }) => learningError(e)))} />
          {canWrite && <MoveButtons index={index} count={count} disabled={busy} onMove={onMove} />}
          <button className="btn btn-ghost btn-sm" onClick={onToggle}>{open ? 'Kapat' : editable ? 'Düzenle' : 'Ayrıntı'}</button>
        </span>
      </div>

      {open && (
        <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={ui.grid}>
            <Field label="Başlık"><input className="input" value={title} disabled={!editable} onChange={(e) => setTitle(e.target.value)} /></Field>
            <Field label="Anlam dili">
              <select className="input" value={c.lang ?? 'tr'} disabled={!editable} onChange={(e) => set('lang', e.target.value as Lang)}>
                {LANGS.map((l) => <option key={l} value={l}>{LANG_LABEL[l]}</option>)}
              </select>
            </Field>
            {ex.kind === 'flashcard' && (
              <Field label="Kartın ön yüzü">
                <select className="input" value={c.front ?? 'syriac'} disabled={!editable} onChange={(e) => set('front', e.target.value as 'syriac' | 'meaning')}>
                  <option value="syriac">Süryanice</option><option value="meaning">Anlam</option>
                </select>
              </Field>
            )}
            {(ex.kind === 'multiple_choice' || ex.kind === 'matching') && (
              <Field label="Yön">
                <select className="input" value={c.direction ?? 'syr_to_meaning'} disabled={!editable}
                  onChange={(e) => set('direction', e.target.value as 'syr_to_meaning' | 'meaning_to_syr')}>
                  <option value="syr_to_meaning">Süryanice → anlam</option><option value="meaning_to_syr">Anlam → Süryanice</option>
                </select>
              </Field>
            )}
            {(ex.kind === 'multiple_choice' || ex.kind === 'listening' || ex.kind === 'fill_blank') && num('choices', 2, 6, 'Seçenek sayısı')}
            {ex.kind === 'matching' && num('pairs', 3, 8, 'Bir turda çift')}
            {ex.kind === 'reading' && (
              <label style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.85rem' }}>
                <input type="checkbox" checked={c.show_translation ?? true} disabled={!editable} onChange={(e) => set('show_translation', e.target.checked)} />
                Çeviri gösterilsin
              </label>
            )}
          </div>
          <Field label="Yönerge (öğrenciye)">
            <input className="input" value={instructions} disabled={!editable} placeholder={EXERCISE_KIND_HELP[ex.kind]} onChange={(e) => setInstructions(e.target.value)} />
          </Field>

          <div>
            <label style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
              <input type="checkbox" checked={!c.items} disabled={!editable}
                onChange={(e) => set('items', e.target.checked ? undefined : fitting.map((i) => i.id))} />
              Dersin bütün uygun içeriği ({fitting.length}; sonradan eklenenler de dahil)
            </label>
            {fitting.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0 }}>
                {VOCAB_EXERCISES.includes(ex.kind) ? 'Bu tür kelime veya form içeriğiyle çalışır.' : 'Bu tür örnek cümle içeriğiyle çalışır.'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {fitting.map((it) => {
                  const on = !c.items || c.items.includes(it.id)
                  return (
                    <div key={it.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', opacity: on ? 1 : 0.5 }}>
                      <input type="checkbox" style={{ marginTop: '0.5rem' }} checked={on} disabled={!editable || !c.items} onChange={() => toggleItem(it.id)} />
                      <div style={{ flex: 1 }}>
                        <ItemSummary it={it} />
                        {ex.kind === 'fill_blank' && on && (
                          <BlankPicker text={itemSyriac(it)} value={c.blanks?.[it.id]} disabled={!editable}
                            onChange={(n) => {
                              const b = { ...(c.blanks ?? {}) }
                              if (n === undefined) delete b[it.id]; else b[it.id] = n
                              set('blanks', b)
                            }} />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {warn.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: 'var(--color-warning, #9A6B00)' }}>
              {warn.map((w) => <li key={w}>{w}</li>)}
            </ul>
          )}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {editable && <button className="btn btn-primary btn-sm" disabled={busy} onClick={save}>Kaydet</button>}
            {canEdit && <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', color: 'var(--color-danger)' }} disabled={busy} onClick={remove}>Sil</button>}
          </div>
        </div>
      )}
    </div>
  )
}

// Boşluk: cümlenin kelimelerinden biri seçilir (0'dan sayılır)
function BlankPicker({ text, value, disabled, onChange }: {
  text: string; value: number | undefined; disabled: boolean; onChange: (n: number | undefined) => void
}) {
  const words = text.split(/\s+/).filter(Boolean)
  return (
    <div dir="rtl" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
      {words.map((w, i) => (
        <button key={i} type="button" disabled={disabled} className={`btn btn-sm ${value === i ? 'btn-accent' : 'btn-ghost'}`}
          style={{ minHeight: 32, padding: '0 0.5rem' }} onClick={() => onChange(value === i ? undefined : i)}>
          <Syr size="1.1rem">{value === i ? '____' : w}</Syr>
        </button>
      ))}
      <span dir="ltr" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', alignSelf: 'center' }}>boşluk olacak kelimeye dokunun</span>
    </div>
  )
}
