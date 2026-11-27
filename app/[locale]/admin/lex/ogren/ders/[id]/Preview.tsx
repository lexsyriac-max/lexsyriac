'use client'

import { useEffect, useState } from 'react'
import {
  fetchLessonContent, EXERCISE_KIND_LABEL, LANGS, type LessonContent, type Lang,
} from '@/lib/lex'
import { Syr, ui } from '../../../components'
import { formTags, itemSyriac } from './LessonItems'

// Öğrencinin göreceği sıranın kaba önizlemesi (asıl oynatıcı modül 6'da).
// Taslak içerik de görünür; ziyaretçi yalnız yayımlanmışı görür.
export function Preview({ content: initial, id }: { content: LessonContent | null; id: string }) {
  const [lang, setLang] = useState<Lang>('tr')
  const [content, setContent] = useState<LessonContent | null>(initial)

  useEffect(() => {
    if (lang === 'tr') return
    let alive = true
    fetchLessonContent(id, lang).then(({ content: c }) => { if (alive) setContent(c) })
    return () => { alive = false }
  }, [id, lang])

  const shown = lang === 'tr' ? initial : content
  if (!shown) return <div className="card" style={ui.card}>Önizleme yüklenemedi.</div>
  const l = shown.lesson

  return (
    <section className="card" style={{ ...ui.card, maxWidth: 560, margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
        {LANGS.map((x) => (
          <button key={x} className={`btn btn-sm ${lang === x ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setLang(x)}>{x.toUpperCase()}</button>
        ))}
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{l.unit.title_tr}{l.unit.level ? ` · ${l.unit.level}` : ''}</div>
      <h2 style={{ fontFamily: 'var(--font-display)', margin: '0.2rem 0 0.4rem' }}>{lang === 'tr' ? l.title_tr : l.title_en || l.title_tr}</h2>
      {l.goal && <p style={{ fontStyle: 'italic', margin: '0 0 0.6rem' }}>{l.goal}</p>}
      {l.intro && <p style={{ whiteSpace: 'pre-wrap', margin: '0 0 1rem' }}>{l.intro}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {shown.items.map((it) => (
          <div key={it.id} style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.6rem', opacity: it.published === false ? 0.6 : 1 }}>
            {it.kind === 'text' ? <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{it.body}</p>
              : it.kind === 'paradigm' ? <p style={{ margin: 0 }}>Çekim tablosu: <strong>{it.label ?? it.code}</strong></p>
              : (
                <div style={{ textAlign: 'center' }}>
                  <div><Syr size={it.kind === 'example' ? '1.6rem' : '2rem'}>{itemSyriac(it)}</Syr></div>
                  {it.transliteration && <div style={{ fontStyle: 'italic', color: 'var(--color-text-muted)' }}>{it.transliteration}</div>}
                  {it.kind === 'word_form' && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{formTags(it)}</div>}
                  <div style={{ fontWeight: 600 }}>{it.meaning || it.translation || <span style={{ color: 'var(--color-danger)', fontWeight: 400 }}>bu dilde anlam yok</span>}</div>
                  {it.audio?.length ? <div style={{ fontSize: '0.8rem' }}>🔊 {it.audio.length} ses</div> : null}
                </div>
              )}
            {it.note && <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0.3rem 0 0' }}>{it.note}</p>}
            {it.published === false && <p style={{ fontSize: '0.75rem', color: 'var(--color-danger)', margin: '0.2rem 0 0' }}>yayımlanmamış: ziyaretçi görmez</p>}
          </div>
        ))}
      </div>

      {shown.exercises.length > 0 && (
        <div style={{ marginTop: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', margin: '0 0 0.4rem' }}>Alıştırmalar</h3>
          <ol style={{ margin: 0, paddingLeft: '1.2rem' }}>
            {shown.exercises.map((e) => (
              <li key={e.id} style={{ opacity: e.status === 'published' ? 1 : 0.6 }}>
                {e.title || EXERCISE_KIND_LABEL[e.kind]} <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>({EXERCISE_KIND_LABEL[e.kind]}{e.status !== 'published' ? ', taslak' : ''})</span>
              </li>
            ))}
          </ol>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Oyunların kendisi halka açık sitede (modül 6) oynatılır.</p>
        </div>
      )}
    </section>
  )
}
