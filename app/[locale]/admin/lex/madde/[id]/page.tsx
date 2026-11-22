'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import {
  lexDb, syrSkeleton, explainError, myLexRole, setLexemeStatus,
  LEXEME_SELECT, POS_LABEL, GENDER_LABEL, LANGS, STATUS_LABEL,
  type LexemeRow, type Lang, type Status, type Category,
} from '@/lib/lex'
import { LexNav, StatusBadge, Syr, NoRole, Field, ui } from '../../components'
import { SenseCategories } from './SenseCategories'
import { Examples } from './Examples'

type SenseDraft = {
  key: string
  id?: string
  sense_no: number
  definition: string
  usage_note: string
  glosses: Record<Lang, string> // "; " ile ayrılmış; ilki birincil
}

const EMPTY = {
  radicals: '', lemma_west: '', lemma_east: '', transliteration: '',
  pos: 'noun', gender: '', stem_code: '', paradigm_class_id: '', variety_code: 'classical',
  homonym_no: 1, notes: '', source_note: '',
}

let keySeq = 0
const newKey = () => `s${++keySeq}`
const blankSense = (no: number): SenseDraft => ({
  key: newKey(), sense_no: no, definition: '', usage_note: '', glosses: { tr: '', en: '', de: '' },
})
const splitGloss = (t: string) => Array.from(new Set(t.split(';').map((x) => x.trim()).filter(Boolean)))

export default function LexemeEditPage() {
  const locale = useLocale()
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'yeni'

  const [role, setRole] = useState<string | null | undefined>(undefined)
  const [form, setForm] = useState(EMPTY)
  const [senses, setSenses] = useState<SenseDraft[]>([blankSense(1)])
  const [removed, setRemoved] = useState<string[]>([])
  const [status, setStatus] = useState<Status>('draft')
  const [stems, setStems] = useState<{ code: string; name: string }[]>([])
  const [varieties, setVarieties] = useState<{ code: string; name_tr: string }[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [classes, setClasses] = useState<{ id: string; code: string; label: string | null; pos: string; stem_code: string | null; radical_count: number; status: Status }[]>([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isEditor = role === 'editor' || role === 'admin'

  useEffect(() => {
    myLexRole().then(setRole)
    const db = lexDb()
    db.from('verb_stem').select('code,name').order('seq').then(({ data }) => setStems(data ?? []))
    db.from('variety').select('code,name_tr').order('code').then(({ data }) => setVarieties(data ?? []))
    db.from('paradigm_class').select('id,code,label,pos,stem_code,radical_count,status').order('code').then(({ data }) => setClasses(data ?? []))
    db.from('category').select('code,name_tr,name_en,parent').then(({ data }) => setCategories(data ?? []))
  }, [])

  useEffect(() => {
    if (isNew) return
    lexDb().from('lexeme').select(LEXEME_SELECT).eq('id', id).maybeSingle().then(({ data, error: e }) => {
      setLoading(false)
      if (e) { setError(explainError(e)); return }
      if (!data) { setError('Madde bulunamadı.'); return }
      const r = data as unknown as LexemeRow
      setForm({
        radicals: r.root?.radicals ?? '', lemma_west: r.lemma_west ?? '', lemma_east: r.lemma_east ?? '',
        transliteration: r.transliteration ?? '', pos: r.pos, gender: r.gender ?? '', stem_code: r.stem_code ?? '', paradigm_class_id: r.paradigm_class_id ?? '',
        variety_code: r.variety_code, homonym_no: r.homonym_no, notes: r.notes ?? '', source_note: r.source_note ?? '',
      })
      setStatus(r.status)
      const ss = [...r.sense].sort((a, b) => a.sense_no - b.sense_no).map((s) => {
        const gl: Record<Lang, string> = { tr: '', en: '', de: '' }
        for (const l of LANGS) {
          gl[l] = s.gloss.filter((g) => g.lang === l)
            .sort((a, b) => Number(b.is_primary) - Number(a.is_primary)).map((g) => g.text).join('; ')
        }
        return { key: newKey(), id: s.id, sense_no: s.sense_no, definition: s.definition ?? '', usage_note: s.usage_note ?? '', glosses: gl }
      })
      setSenses(ss.length ? ss : [blankSense(1)])
    })
  }, [id, isNew])

  // Yazım denetimi (veritabanındaki CHECK kuralının önizlemesi)
  const skel = useMemo(() => {
    const w = syrSkeleton(form.lemma_west), e = syrSkeleton(form.lemma_east)
    return { value: w || e, mismatch: !!(w && e && w !== e) }
  }, [form.lemma_west, form.lemma_east])
  const rootSkel = syrSkeleton(form.radicals)
  // Türe ve fiil kalıbına uyan çekim sınıfları (veritabanı da aynı kuralı uygular)
  const fitClasses = classes.filter((c) => c.pos === form.pos && (!c.stem_code || c.stem_code === (form.pos === 'verb' ? form.stem_code : '')))
  const chosenClass = classes.find((c) => c.id === form.paradigm_class_id)
  const classMismatch = !!form.paradigm_class_id && !fitClasses.some((c) => c.id === form.paradigm_class_id)

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setForm((f) => ({ ...f, [k]: v }))
  const setSense = (key: string, patch: Partial<SenseDraft>) =>
    setSenses((ss) => ss.map((s) => (s.key === key ? { ...s, ...patch } : s)))

  async function save() {
    setError(''); setMsg('')
    if (!skel.value) { setError('Batı veya Doğu harekeli yazımdan en az biri gerekli.'); return }
    if (skel.mismatch) { setError('Batı ve Doğu yazımlarının ünsüz iskeleti farklı.'); return }
    if (classMismatch) { setError('Seçili çekim sınıfı maddenin türüne / fiil kalıbına uymuyor.'); return }
    setSaving(true)
    try {
      // Tek işlem: kök + madde + anlam + karşılık (lex.save_lexeme).
      // Herhangi bir adımda hata olursa veritabanında hiçbir şey değişmez.
      const payload = {
        id: isNew ? null : id,
        radicals: rootSkel || null,
        lexeme: {
          lemma_skeleton: skel.value,
          lemma_west: form.lemma_west.trim() || null,
          lemma_east: form.lemma_east.trim() || null,
          transliteration: form.transliteration.trim() || null,
          pos: form.pos,
          gender: form.pos === 'verb' ? null : form.gender || null,
          stem_code: form.pos === 'verb' ? form.stem_code || null : null,
          paradigm_class_id: form.paradigm_class_id || null,
          variety_code: form.variety_code,
          homonym_no: form.homonym_no || 1,
          notes: form.notes.trim() || null,
          source_note: form.source_note.trim() || null,
        },
        removed,
        senses: senses.map((s) => ({
          key: s.key,
          id: s.id ?? null,
          definition: s.definition,
          usage_note: s.usage_note,
          glosses: LANGS.flatMap((lang) =>
            splitGloss(s.glosses[lang]).map((text, i) => ({ lang, text, is_primary: i === 0 }))),
        })),
      }
      const { data, error: e } = await lexDb().rpc('save_lexeme', { p: payload })
      if (e) throw e
      const res = data as { lexeme_id: string; senses: { key: string; id: string; sense_no: number }[] }
      const lexemeId = res.lexeme_id
      const byKey = new Map(res.senses.map((r) => [r.key, r]))
      const saved: SenseDraft[] = senses
        .filter((s) => byKey.has(s.key))
        .map((s) => ({ ...s, id: byKey.get(s.key)!.id, sense_no: byKey.get(s.key)!.sense_no }))

      setRemoved([])
      setSenses(saved.length ? saved : [blankSense(1)])
      setMsg('Kaydedildi.')
      if (isNew) router.replace(`/${locale}/admin/lex/madde/${lexemeId}`)
    } catch (e) {
      setError(explainError(e as { code?: string; message?: string }))
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(s: Status) {
    setError(''); setMsg('')
    const err = await setLexemeStatus(id, s)
    if (err) setError(err)
    else { setStatus(s); setMsg('Durum güncellendi.') }
  }

  async function remove() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    const { error: e, count } = await lexDb().from('lexeme').delete({ count: 'exact' }).eq('id', id)
    if (e || !count) { setError(e ? explainError(e) : 'Silinemedi (yetki yok).'); return }
    router.replace(`/${locale}/admin/lex`)
  }

  const locked = !isNew && !isEditor && (status === 'reviewed' || status === 'published')

  return (
    <main className="container" style={{ padding: '1.5rem 0 3rem', maxWidth: 960 }}>
      <LexNav locale={locale} role={role ?? null} />
      {role === null && <NoRole />}
      {loading ? <p>Yükleniyor…</p> : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{isNew ? 'Yeni madde' : 'Maddeyi düzenle'}</h1>
            {!isNew && <StatusBadge status={status} />}
            {skel.value && <Syr size="1.8rem">{form.lemma_west || form.lemma_east}</Syr>}
          </div>
          {locked && (
            <p className="card" style={{ padding: '0.75rem 1rem', background: 'var(--color-accent-light)' }}>
              Bu madde {status === 'published' ? 'yayımlanmış' : 'incelenmiş'}; yalnız editör değiştirebilir.
            </p>
          )}

          <section className="card" style={card}>
            <h2 style={h2}>Madde</h2>
            <div style={grid}>
              <Field label="Batı harekeli (Serto)">
                <input className="input" dir="rtl" lang="syr" style={syrInput} value={form.lemma_west} onChange={(e) => set('lemma_west', e.target.value)} />
              </Field>
              <Field label="Doğu harekeli">
                <input className="input" dir="rtl" lang="syr" style={syrInput} value={form.lemma_east} onChange={(e) => set('lemma_east', e.target.value)} />
              </Field>
              <Field label="İskelet (otomatik)">
                <div className="input" style={{ ...syrInput, background: 'var(--color-bg-subtle)', color: skel.mismatch ? 'var(--color-danger)' : undefined }} dir="rtl">
                  {skel.mismatch ? 'Batı/Doğu iskeleti uyuşmuyor' : skel.value || '—'}
                </div>
              </Field>
              <Field label="Kök (harekesiz)">
                <input className="input" dir="rtl" lang="syr" style={syrInput} value={form.radicals} onChange={(e) => set('radicals', e.target.value)} />
              </Field>
              <Field label="Transliterasyon">
                <input className="input" value={form.transliteration} onChange={(e) => set('transliteration', e.target.value)} />
              </Field>
              <Field label="Tür">
                <select className="input" value={form.pos} onChange={(e) => set('pos', e.target.value)}>
                  {Object.entries(POS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              {form.pos === 'verb' ? (
                <Field label="Fiil kalıbı">
                  <select className="input" value={form.stem_code} onChange={(e) => set('stem_code', e.target.value)}>
                    <option value="">—</option>
                    {stems.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
                  </select>
                </Field>
              ) : (
                <Field label="Cinsiyet">
                  <select className="input" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                    <option value="">—</option>
                    {Object.entries(GENDER_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Çekim sınıfı">
                <select className="input" value={form.paradigm_class_id} onChange={(e) => set('paradigm_class_id', e.target.value)}
                  style={classMismatch ? { borderColor: 'var(--color-danger)' } : undefined}>
                  <option value="">—</option>
                  {classMismatch && chosenClass && <option value={chosenClass.id}>{chosenClass.code} (uymuyor)</option>}
                  {fitClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code}{c.label ? ` — ${c.label}` : ''}{c.status !== 'published' ? ` (${STATUS_LABEL[c.status]})` : ''}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Lehçe / dönem">
                <select className="input" value={form.variety_code} onChange={(e) => set('variety_code', e.target.value)}>
                  {varieties.map((v) => <option key={v.code} value={v.code}>{v.name_tr}</option>)}
                </select>
              </Field>
              <Field label="Eş sesli no">
                <input className="input" type="number" min={1} value={form.homonym_no} onChange={(e) => set('homonym_no', Number(e.target.value))} />
              </Field>
            </div>
            <div style={{ ...grid, marginTop: '0.75rem' }}>
              <Field label="Not">
                <textarea className="input" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
              </Field>
              <Field label="Kaynak notu (sözlük, sayfa…)">
                <textarea className="input" rows={2} value={form.source_note} onChange={(e) => set('source_note', e.target.value)} />
              </Field>
            </div>
          </section>

          <section className="card" style={card}>
            <h2 style={h2}>Anlamlar</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 0 }}>
              Her dilde birden çok karşılığı <code>;</code> ile ayırın. İlk yazılan birincil karşılıktır.
            </p>
            {senses.map((s, i) => (
              <div key={s.key} style={{ borderTop: i ? '1px solid var(--color-border)' : 'none', paddingTop: i ? '1rem' : 0, marginTop: i ? '1rem' : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong>Anlam {s.id ? s.sense_no : `${i + 1} (yeni)`}</strong>
                  {senses.length > 1 && (role === 'admin' || !s.id) && (
                    <button type="button" className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto', color: 'var(--color-danger)' }}
                      onClick={() => { if (s.id) setRemoved((r) => [...r, s.id!]); setSenses((ss) => ss.filter((x) => x.key !== s.key)) }}>
                      Kaldır
                    </button>
                  )}
                </div>
                <div style={grid}>
                  {LANGS.map((l) => (
                    <Field key={l} label={`Karşılık ${l.toUpperCase()}`}>
                      <input className="input" value={s.glosses[l]} onChange={(e) => setSense(s.key, { glosses: { ...s.glosses, [l]: e.target.value } })} />
                    </Field>
                  ))}
                </div>
                <div style={{ ...grid, marginTop: '0.5rem' }}>
                  <Field label="Açıklama (TR)">
                    <textarea className="input" rows={2} value={s.definition} onChange={(e) => setSense(s.key, { definition: e.target.value })} />
                  </Field>
                  <Field label="Kullanım notu">
                    <textarea className="input" rows={2} value={s.usage_note} onChange={(e) => setSense(s.key, { usage_note: e.target.value })} />
                  </Field>
                </div>
                {s.id && role && <SenseCategories senseId={s.id} categories={categories} locked={locked} />}
              </div>
            ))}
            <button type="button" className="btn btn-sm btn-secondary" style={{ marginTop: '1rem' }}
              onClick={() => setSenses((ss) => [...ss, blankSense(ss.length + 1)])}>+ Anlam ekle</button>
          </section>

          {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}
          {msg && <p style={{ color: 'var(--color-success)' }}>{msg}</p>}

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={save} disabled={saving || locked || !role}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
            {!isNew && (
              <Link href={`/${locale}/admin/lex/madde/${id}/formlar`} className="btn btn-secondary">Çekimli formlar →</Link>
            )}
            {!isNew && isEditor && (
              <>
                <span style={{ color: 'var(--color-text-subtle)', margin: '0 0.25rem' }}>|</span>
                {status !== 'reviewed' && <button className="btn btn-secondary" onClick={() => changeStatus('reviewed')}>İncelendi</button>}
                {status !== 'published' && <button className="btn btn-accent" onClick={() => changeStatus('published')}>Yayımla</button>}
                {status !== 'draft' && <button className="btn btn-ghost" onClick={() => changeStatus('draft')}>Taslağa al</button>}
                {status !== 'rejected' && <button className="btn btn-ghost" style={{ color: 'var(--color-danger)' }} onClick={() => changeStatus('rejected')}>Reddet</button>}
              </>
            )}
            {!isNew && role === 'admin' && (
              <button className="btn btn-ghost" style={{ marginLeft: 'auto', color: 'var(--color-danger)' }} onClick={remove} onBlur={() => setConfirmDelete(false)}>
                {confirmDelete ? 'Emin misiniz? Silmek için tekrar tıklayın' : 'Maddeyi sil'}
              </button>
            )}
          </div>
          <div style={{ marginTop: '1.5rem' }} />
          {!isNew && (
            <Examples
              lexemeId={id}
              role={role ?? null}
              senses={senses.filter((x) => x.id).map((x) => ({
                id: x.id!, sense_no: x.sense_no, label: splitGloss(x.glosses.tr)[0] ?? splitGloss(x.glosses.en)[0] ?? '',
              }))}
            />
          )}
        </>
      )}
    </main>
  )
}

const { card, h2, grid, syrInput } = ui
