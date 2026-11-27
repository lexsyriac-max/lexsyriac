'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  lexDb, learningError, reorder, moved, ITEM_KIND_LABEL, VERB_FORM_LABEL, PERSON_SHORT, NUMBER_SHORT, GENDER_SHORT,
  type ContentItem, type ExerciseRow,
} from '@/lib/lex'
import { Syr, ui } from '../../../components'
import { MoveButtons } from '../../shared'
import { ItemPicker } from './ItemPicker'

export function itemSyriac(it: ContentItem): string {
  return it.west || it.east || it.skeleton || ''
}

export function formTags(it: ContentItem): string {
  const parts = [
    it.verb_form && VERB_FORM_LABEL[it.verb_form],
    it.person && PERSON_SHORT[it.person], it.number && NUMBER_SHORT[it.number],
    it.gender && (GENDER_SHORT as Record<string, string>)[it.gender],
  ].filter(Boolean)
  return parts.join(' ')
}

export function ItemSummary({ it, locale }: { it: ContentItem; locale?: string }) {
  const syr = itemSyriac(it)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap' }}>
      {syr && <Syr>{syr}</Syr>}
      {it.kind === 'text' && <span style={{ whiteSpace: 'pre-wrap' }}>{it.body}</span>}
      {it.kind === 'paradigm' && (locale
        ? <Link href={`/${locale}/admin/lex/paradigma/${it.paradigm_class_id}`}><code>{it.code}</code> {it.label}</Link>
        : <span><code>{it.code}</code> {it.label}</span>)}
      {it.transliteration && <i style={{ color: 'var(--color-text-muted)' }}>{it.transliteration}</i>}
      {it.kind === 'word_form' && <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{formTags(it)} · <Syr size="1rem">{it.lemma}</Syr></span>}
      {(it.meaning || it.translation) && <span>{it.meaning || it.translation}</span>}
      {it.audio?.length ? <span title="Sesi var" style={{ fontSize: '0.8rem' }}>🔊</span> : null}
      {locale && it.lexeme_id && <Link href={`/${locale}/admin/lex/madde/${it.lexeme_id}`} style={{ fontSize: '0.75rem' }}>madde →</Link>}
    </span>
  )
}

export function LessonItems({ lessonId, items, exercises, canWrite, busy, locale, onRun }: {
  lessonId: string; items: ContentItem[]; exercises: ExerciseRow[]; canWrite: boolean; busy: boolean; locale: string
  onRun: (p: PromiseLike<string>, ok?: string) => Promise<void>
}) {
  const [noteFor, setNoteFor] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [adding, setAdding] = useState(false)

  const usedIn = (id: string) => exercises.filter((e) => e.config.items?.includes(id) || (e.config.blanks && id in e.config.blanks)).length

  function saveNote(id: string) {
    return onRun(lexDb().from('lesson_item').update({ note: note.trim() || null }).eq('id', id)
      .then(({ error: e }) => { if (!e) setNoteFor(null); return learningError(e) }))
  }
  function remove(it: ContentItem) {
    if (!confirm('İçerik satırı dersten çıkarılsın mı? (Sözlükteki kayıt silinmez.)')) return
    return onRun(lexDb().from('lesson_item').delete().eq('id', it.id).then(({ error: e }) => learningError(e)))
  }

  return (
    <section className="card" style={ui.card}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h2 style={{ ...ui.h2, margin: 0 }}>İçerik <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>({items.length})</span></h2>
        {canWrite && !adding && <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setAdding(true)}>+ İçerik ekle</button>}
      </div>
      {items.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
          Henüz içerik yok. Sözlükten kelime, form, örnek cümle, çekim tablosu veya açıklama metni ekleyin.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <tbody>
            {items.map((it, i) => (
              <tr key={it.id}>
                <td style={{ ...ui.td, width: 30, color: 'var(--color-text-subtle)' }}>{it.seq}</td>
                <td style={{ ...ui.td, width: 120, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {ITEM_KIND_LABEL[it.kind]}
                  {it.published === false && <div style={{ color: 'var(--color-danger)' }}>yayımlanmamış</div>}
                  {usedIn(it.id) > 0 && <div>{usedIn(it.id)} alıştırmada</div>}
                </td>
                <td style={ui.td}>
                  <ItemSummary it={it} locale={locale} />
                  {noteFor === it.id ? (
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.3rem' }}>
                      <input className="input" style={{ flex: 1 }} value={note} placeholder="Öğrenciye kısa not" autoFocus
                        onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveNote(it.id) }} />
                      <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => saveNote(it.id)}>Kaydet</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setNoteFor(null)}>Vazgeç</button>
                    </div>
                  ) : it.note ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>Not: {it.note}</div>
                  ) : null}
                </td>
                <td style={{ ...ui.td, width: 170, whiteSpace: 'nowrap', textAlign: 'right' }}>
                  {canWrite && (
                    <>
                      <MoveButtons index={i} count={items.length} disabled={busy}
                        onMove={(d) => onRun(reorder('lesson_item', moved(items, i, d).map((x) => x.id)))} />
                      <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => { setNoteFor(it.id); setNote(it.note ?? '') }}>Not</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} disabled={busy || usedIn(it.id) > 0}
                        title={usedIn(it.id) > 0 ? 'Bir alıştırmada kullanılıyor' : 'Dersten çıkar'} onClick={() => remove(it)}>×</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {adding && (
        <ItemPicker lessonId={lessonId} existing={items} busy={busy} onClose={() => setAdding(false)} onRun={onRun} />
      )}
    </section>
  )
}
