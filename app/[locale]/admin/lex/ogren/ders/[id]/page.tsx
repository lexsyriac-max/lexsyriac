'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import {
  lexDb, myLexRole, learningError, fetchLessonContent, LESSON_SELECT, EXERCISE_SELECT,
  type LessonRow, type LessonContent, type ExerciseRow, type Status,
} from '@/lib/lex'
import { LexNav, NoRole, Field, ui } from '../../../components'
import { StatusControl, isEditor } from '../../shared'
import { LessonItems } from './LessonItems'
import { Exercises } from './Exercises'
import { Preview } from './Preview'

type Lesson = LessonRow & { unit: { id: string; title_tr: string; status: Status } | null }
type Problem = { seq: number; problem: string }

type Loaded = { lesson: Lesson | null; content: LessonContent | null; exercises: ExerciseRow[]; problems: Problem[]; error: string }

async function load(id: string): Promise<Loaded> {
  const db = lexDb()
  const [l, c, e, p] = await Promise.all([
    db.from('lesson').select(LESSON_SELECT + ',unit:unit_id(id,title_tr,status)').eq('id', id).maybeSingle(),
    fetchLessonContent(id),
    db.from('exercise').select(EXERCISE_SELECT).eq('lesson_id', id).order('seq'),
    db.rpc('lesson_problems', { p_lesson: id }),
  ])
  const error = [l.error && learningError(l.error), c.error, e.error && learningError(e.error), p.error && learningError(p.error)]
    .filter(Boolean).join(' · ')
  return {
    lesson: (l.data as unknown as Lesson | null) ?? null,
    content: c.content,
    exercises: (e.data as unknown as ExerciseRow[] | null) ?? [],
    problems: (p.data as Problem[] | null) ?? [],
    error,
  }
}

export default function LessonPage() {
  const { id } = useParams<{ id: string }>()
  const locale = useLocale()
  const router = useRouter()
  const [role, setRole] = useState<string | null | undefined>(undefined)
  const [data, setData] = useState<Loaded | null>(null)
  const [draft, setDraft] = useState({ title_tr: '', title_en: '', goal: '', intro: '', source_note: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')

  const apply = useCallback((d: Loaded) => {
    setData(d)
    setError(d.error)
    if (d.lesson) setDraft({
      title_tr: d.lesson.title_tr, title_en: d.lesson.title_en ?? '', goal: d.lesson.goal ?? '',
      intro: d.lesson.intro ?? '', source_note: d.lesson.source_note ?? '',
    })
  }, [])
  const reload = useCallback(() => load(id).then(apply), [id, apply])

  useEffect(() => {
    myLexRole().then(setRole)
    load(id).then(apply)
  }, [id, apply])

  async function run(p: PromiseLike<string>, ok = '') {
    setBusy(true); setError(''); setMsg('')
    const m = await p
    if (m) setError(m); else if (ok) setMsg(ok)
    await reload()
    setBusy(false)
  }

  const lesson = data?.lesson
  const editor = isEditor(role)
  const locked = !!lesson && (lesson.status === 'reviewed' || lesson.status === 'published') && !editor
  const canWrite = !!role && !locked

  function saveHeader() {
    if (!draft.title_tr.trim()) { setError('Ders adı gerekli.'); return }
    run(lexDb().from('lesson').update({
      title_tr: draft.title_tr.trim(), title_en: draft.title_en.trim() || null, goal: draft.goal.trim() || null,
      intro: draft.intro.trim() || null, source_note: draft.source_note.trim() || null,
    }).eq('id', id).then(({ error: e }) => learningError(e)), 'Kaydedildi.')
  }
  async function remove() {
    if (!confirm('Ders, içeriği ve alıştırmalarıyla birlikte silinecek. Sözlük kayıtları silinmez. Emin misiniz?')) return
    setBusy(true)
    const { error: e } = await lexDb().from('lesson').delete().eq('id', id).select('id').single()
    setBusy(false)
    if (e) { setError(e.code === 'PGRST116' ? 'Silinemedi: silme yalnız admin yetkisiyle yapılır.' : learningError(e)); return }
    router.push(`/${locale}/admin/lex/ogren`)
  }

  return (
    <main className="container" style={{ padding: '1.5rem 0 3rem', maxWidth: 960 }}>
      <LexNav locale={locale} role={role ?? null} />
      {role === null && <NoRole />}
      <p style={{ margin: '0 0 0.4rem', fontSize: '0.85rem' }}>
        <Link href={`/${locale}/admin/lex/ogren`}>← Üniteler ve dersler</Link>
        {lesson?.unit && <span style={{ color: 'var(--color-text-muted)' }}> · {lesson.unit.title_tr}</span>}
      </p>
      {data === null ? <p>Yükleniyor…</p> : !lesson ? (
        <div className="card" style={ui.card}>Ders bulunamadı. {error}</div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{lesson.seq}. {lesson.title_tr}</h1>
            <StatusControl status={lesson.status} canEdit={editor} busy={busy}
              onChange={(s) => run(lexDb().from('lesson').update({ status: s }).eq('id', id).then(({ error: e }) => learningError(e)))} />
            <span className="btn-group" style={{ marginLeft: 'auto', display: 'inline-flex', gap: '0.3rem' }}>
              <button className={`btn btn-sm ${tab === 'edit' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('edit')}>Düzenle</button>
              <button className={`btn btn-sm ${tab === 'preview' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('preview')}>Önizleme</button>
            </span>
          </div>

          {lesson.status === 'published' && lesson.unit?.status !== 'published' && (
            <p style={{ fontSize: '0.85rem', color: 'var(--color-warning, #9A6B00)' }}>
              Ders yayımlandı ama ünitesi yayımlanmadı: ziyaretçi henüz görmez.
            </p>
          )}
          {locked && <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Ders {lesson.status === 'published' ? 'yayımlandı' : 'incelendi'}; değişiklik yalnız editörle yapılır.</p>}
          {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}
          {msg && <p style={{ color: 'var(--color-success, #0F6E56)' }}>{msg}</p>}

          {tab === 'preview' ? <Preview content={data.content} id={id} /> : (
            <>
              <section className="card" style={ui.card}>
                <div style={ui.grid}>
                  <Field label="Ad (TR)"><input className="input" value={draft.title_tr} disabled={!canWrite} onChange={(e) => setDraft({ ...draft, title_tr: e.target.value })} /></Field>
                  <Field label="Ad (EN)"><input className="input" value={draft.title_en} disabled={!canWrite} onChange={(e) => setDraft({ ...draft, title_en: e.target.value })} /></Field>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Field label="Amaç (öğrenci bu dersin sonunda ne yapabilir?)">
                      <input className="input" value={draft.goal} disabled={!canWrite} onChange={(e) => setDraft({ ...draft, goal: e.target.value })} />
                    </Field>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Field label="Giriş anlatımı (ders başında gösterilir)">
                      <textarea className="input" rows={4} value={draft.intro} disabled={!canWrite} onChange={(e) => setDraft({ ...draft, intro: e.target.value })} />
                    </Field>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Field label="Kaynak / telif notu (ör. hangi ders belgesinden, izin durumu)">
                      <input className="input" value={draft.source_note} disabled={!canWrite} onChange={(e) => setDraft({ ...draft, source_note: e.target.value })} />
                    </Field>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  {canWrite && <button className="btn btn-primary btn-sm" onClick={saveHeader} disabled={busy}>Kaydet</button>}
                  {role === 'admin' && <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', color: 'var(--color-danger)' }} onClick={remove} disabled={busy}>Dersi sil</button>}
                </div>
              </section>

              {data.problems.length > 0 && (
                <section className="card" style={{ ...ui.card, borderColor: 'var(--color-warning, #C9A227)' }}>
                  <h2 style={ui.h2}>Yayından önce</h2>
                  <p style={{ fontSize: '0.85rem', margin: '0 0 0.4rem', color: 'var(--color-text-muted)' }}>
                    Ders, gösterdiği her kayıt yayımlanmadan yayımlanamaz:
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.88rem' }}>
                    {data.problems.map((p) => <li key={p.seq + p.problem}>{p.seq}. satır: {p.problem}</li>)}
                  </ul>
                </section>
              )}

              <LessonItems lessonId={id} items={data.content?.items ?? []} exercises={data.exercises}
                canWrite={canWrite} busy={busy} locale={locale} onRun={run} />
              <Exercises lessonId={id} items={data.content?.items ?? []} exercises={data.exercises}
                canWrite={!!role} canEdit={editor} lessonLocked={locked} busy={busy} onRun={run} />
            </>
          )}
        </>
      )}
    </main>
  )
}
